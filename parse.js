import { Client } from "@notionhq/client"
import { NotionToMarkdown } from "notion-to-md"
import config from 'config'
import fs from 'fs'
import path from 'path'
import url from 'url'
import slugify from 'slugify'
import download from "image-downloader"
import sharp from "sharp"

// Getting Default Values
const secret_notion_key = config.get('secret_notion_key')
const MAX_IMAGE_WIDTH =   config.get('max_image_width')
const JPEG_QUALITY =      config.get('jpeg_quality')

// Initialising Notion
const notion = new Client({ auth: secret_notion_key });
const n2m = new NotionToMarkdown({ notionClient: notion });

export async function parseData(response, output_path) {
  // console.log("parseData output_path", output_path);
  // console.log("parseData response", response);

  var output = ""
  for (const block of response.results) {
    switch (block.type) {

      case 'callout': {
        let icon = block[block.type].icon
        let admonition = 'note' // default
        if (icon.type === 'emoji') {
          // https://squidfunk.github.io/mkdocs-material/reference/admonitions/#supported-types
          switch (icon.emoji) {
            case '✏️': admonition = 'note';
            case '📝': admonition = 'note'; break;
            case '🗒': admonition = 'abstract'; break;  // summary, tldr
            case 'ℹ️': admonition = 'info'; break;      // todo
            case '🔥': admonition = 'tip'; break;       // hint, important
            case '✅': admonition = 'success'; break;   // check, done
            case '❓': admonition = 'questions'; break; // help, faq
            case '⚠️': admonition = 'warning'; break;   // caution, attention
            case '❌': admonition = 'failure'; break;  // fail, missing
            case '⚡️': admonition = 'danger'; break;    // error
            case '🐞': admonition = 'bug'; break;
            case '📌': admonition = 'example'; break;
            case '📖': admonition = 'quote'; break;     // cite
          }
        }
        let b = await n2m.blockToMarkdown(block)

        // split by newline
        let s = b.split('\n')

        let firstLine = s[0]

        // callout body
        s.shift()
        let body = s.join('\n')

        // Admonition Type
        let type = '!!!'
        if (firstLine.slice(0,4) === '???+') {
          type = '???+'
        } else if (firstLine.slice(0,3) === '???') {
          type = '???'
        }

        // Inline & End
        let position = ''
        if (firstLine.includes(' inline')) position += ' inline'
        if (firstLine.includes(' end')) position += ' end'

        // Admonition Title
        let title = firstLine.match(/“([^']+)”/)[1];

        // Additional Classes
        // TODO

        output += `${type} ${admonition} "${title}"${position}\n    ${body}\n\n`
        break
      }

      case 'image': {
        let caption = "image"
        if (block.image.caption) {
          let caption_long = block.image.caption.map(c => c.plain_text)
          caption = caption_long.join(" ")
        }
        let imageUrl = ""
        if (block.image.type === 'file') {
          imageUrl = block.image.file.url
        } else if (block.image.type === 'external') {
          imageUrl = block.image.external.url
        }

        let o = url.parse(imageUrl)
        let imageName = o.pathname.split('/').pop() // get last

        let originalImagePath = path.join(...output_path, "original_"+imageName)
        let resizedImagePath = path.join(...output_path, imageName)

        download.image({
          url: imageUrl,
          dest: originalImagePath
        })
        .then(({ filename }) => {
          const image = sharp(filename);
          image
            .metadata()
            .then(function(metadata) {
              // https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
              let str = `${metadata.width}, ${filename}`
              let green = '\x1b[43m'
              let white = '\x1b[37m'
              let reset = '\x1b[0m'
              console.log('Image: '+green+white+str+reset)
              let w = metadata.width > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH : metadata.width
              return image
                .resize({ width: w })
                .jpeg({ quality: JPEG_QUALITY })
                .toFile(resizedImagePath)
                .then(info => {
                  if (metadata.width > MAX_IMAGE_WIDTH) {
                    let str = `Image saved & resized, new width: ${info.width}, Size: ${info.size}`
                    console.log('\x1b[44m\x1b[30m%s\x1b[0m', str)
                  } else {
                    let str = `Image saved, not resized, width: ${info.width}, Size: ${info.size}`
                    console.log('\x1b[45m\x1b[30m%s\x1b[0m', str)
                  }
                  fs.unlink(originalImagePath, err => {})
                })
                .catch(err => console.error(err))
            })
        })
        .catch(err => console.error(err))

        let image = `![${caption}](${imageName})`
        output += image + "\n\n"

        // Extra DIV for Caption
        /*
        // updated https://github.com/souvikinator/notion-to-md/commit/5e22fcb485eabedeaa8c6075954789da61ee50d5
        const caption = block[block.type].caption[0]
        console.log(caption);
        console.log(caption.plain_text);
        output += n2m.blockToMarkdown(block) + "\n"
        if (caption.plain_text) output += `<figcaption>${caption.plain_text}</figcaption>`
        break
        */
        break
      }
      case 'child_page': {
        let title = block.child_page.title
        let link = slugify(title, {lower: true})
        output += `[${title}](${link})\n\n`
        break
      }

      default: {
        output += await n2m.blockToMarkdown(block) + "\n\n" // blockToMarkdown async since 2.2.1 for tables sub-blocks
      }
    }
  }
  return output
}
