import { Client } from "@notionhq/client"
import { NotionToMarkdown } from "notion-to-md"
import fs from 'fs'
import path from 'path'
import url from 'url'
import slugify from 'slugify'
import download from "image-downloader"
import sharp from "sharp"

const MAX_IMAGE_WIDTH = 1024
const JPEG_QUALITY = 75

const notion_key = process.env.NOTION_KEY
const notion = new Client({ auth: notion_key });
const n2m = new NotionToMarkdown({ notionClient: notion });

export async function parseData(response, output_path) {
  console.log("parseData output_path", output_path);
  // console.log("parseData response", response);

  var output = ""
  for (const block of response.results) {
    switch (block.type) {

      case 'callout': {
        let icon = block[block.type].icon
        let admonition = 'note'
        if (icon.type === 'emoji') {
          // https://docutils.sourceforge.io/docs/ref/rst/directives.html#specific-admonitions
          switch (icon.emoji) {
            case '🗒': admonition = 'note'; break;
            case '⚠️': admonition = 'warning'; break;
            case '🔥': admonition = 'danger'; break;
            case '‼️': admonition = 'attention'; break;
            case '⚠️': admonition = 'caution'; break;
            case '❌': admonition = 'error'; break;
            case '💡': admonition = 'hint'; break;
            case 'ℹ️': admonition = 'important'; break;
            case '🎉': admonition = 'tip'; break;
          }
        }
        let b = await n2m.blockToMarkdown(block)
        let title = ''
        let s = b.split('\n')
        let f = s[0]
        s.shift()
        let body = s.join('\n')
        if (f.startsWith('“') && f.endsWith('”')) {
          title = f.replaceAll('“', '')
          title = title.replaceAll('”', '')
        }
        output += `!!! ${admonition} "${title}"\n    ${body}\n`
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

          console.log(filename);
          const image = sharp(filename);
          image
            .metadata()
            .then(function(metadata) {
              console.log("Original Image width: " + metadata.width)
              let w = metadata.width > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH : metadata.width
              return image
                .resize({ width: w })
                .jpeg({ quality: JPEG_QUALITY })
                .toFile(resizedImagePath)
                .then(info => {
                  if (metadata.width > MAX_IMAGE_WIDTH) {
                    console.log("Image saved & resized, new width: " + info.width + ", Size: " + info.size)
                  } else {
                    let str = `Image saved, not resized, width: ${info.width}, Size: ${info.size}`
                    console.log('\x1b[45m\x1b[30m%s\x1b[0m', str)  //cyan

                  }
                  console.log();
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

      default: {
        output += await n2m.blockToMarkdown(block) + "\n\n" // blockToMarkdown async since 2.2.1 for tables sub-blocks
      }

    }
  }

  return output
}
