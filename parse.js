import { Client } from "@notionhq/client"
import { NotionToMarkdown } from "notion-to-md";

const notion_key = process.env.NOTION_KEY
const notion = new Client({ auth: notion_key });
const n2m = new NotionToMarkdown({ notionClient: notion });

export function parseData(response) {

  var output = ""
  response.results.forEach(function(block) {

    switch (block.type) {
      case 'callout': {
        break

        
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
        console.log(b);
        break

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
