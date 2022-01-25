import { Client } from "@notionhq/client"
import { NotionToMarkdown } from "notion-to-md"
import fs from 'fs'
import path from 'path'
import url from 'url'
import slugify from 'slugify'
import download from "image-downloader"
import sharp from "sharp"

const notion_key = process.env.NOTION_KEY
const notion = new Client({ auth: notion_key });
const n2m = new NotionToMarkdown({ notionClient: notion });

export function parseData(response, output_path) {
  console.log("parseData", output_path);

  var output = ""
  response.results.forEach(function(block) {

    switch (block.type) {
      case 'callout': {
        let icon = block[block.type].icon
        let admonition = 'note'
        if (icon.type === 'emoji') {
          // https://docutils.sourceforge.io/docs/ref/rst/directives.html#specific-admonitions
          switch (icon.emoji) {
            case '‼️': admonition = 'attention'; break;
            case '⚠️': admonition = 'caution'; break;
            case '🔥': admonition = 'danger'; break;
            case '❌': admonition = 'error'; break;
            case '💡': admonition = 'hint'; break;
            case 'ℹ️': admonition = 'important'; break;
            case '🎉': admonition = 'tip'; break;
            case '⚠️': admonition = 'warning'; break;
          }
        }
        let b = n2m.blockToMarkdown(block)
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

        let imageObject = url.parse(block.image.file.url)
        let imageName = imageObject.pathname.split('/')[3]
        let originalImagePath = path.join(...output_path, "original_"+imageName)
        let resizedImagePath = path.join(...output_path, imageName)

        download.image({
          url: block.image.file.url,
          dest: originalImagePath
        })
        .then(({ filename }) => {
          sharp(filename)
            .resize({ width: 1024 })
            .jpeg({ quality: 75 })
            .toFile(resizedImagePath)
            .then(info => {
              console.log("Image resized", info.size)
              fs.unlink(originalImagePath, err => {})
            })
            .catch(err => console.error(err))
        })
        .catch(err => console.error(err))

        //let image = n2m.blockToMarkdown(block)
        let image = `![${caption}](${imageName})`
        output += image + "\n"

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
        output += n2m.blockToMarkdown(block) + "\n"
      }
    }
  });

  return output
}


function downloadImage(url, filepath) {
  return download.image({
   url,
   dest: filepath
  });
}
