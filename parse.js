import { Client } from "@notionhq/client"
import { NotionToMarkdown } from "notion-to-md"
import fs from 'fs'
import path from 'path'
import url from 'url'
import slugify from 'slugify'
import download from "image-downloader"

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
        console.log(n2m.blockToMarkdown(block.image));

        let imageUrl = url.parse(block.image.file.url)
        let imageName = imageUrl.pathname.split('/')[3]
        let imagePath = path.join(...output_path, imageName)
        downloadImage(block.image.file.url, imagePath)

        //let image = n2m.blockToMarkdown(block)
        let image = `![](${imageName})`
        console.log(image);
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
