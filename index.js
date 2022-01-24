import { Client } from "@notionhq/client"
import { NotionToMarkdown } from "notion-to-md";
import fs from 'fs'

const notion_key = process.env.NOTION_KEY
const pageId = process.env.PAGE_ID
const notion = new Client({ auth: notion_key });
const n2m = new NotionToMarkdown();

if (!notion_key) {
  console.log("Please check your Notion Key");
  process.exit(0)
}
if (!pageId) {
  console.log("Please check your Page ID");
  process.exit(0)
}



/*
// passing notion client to the option
const n2m = new NotionToMarkdown({ notionClient: notion });

;
(async () => {
  const mdblocks = await n2m.pageToMarkdown(pageId);
  const mdString = n2m.toMarkdownString(mdblocks);

  //writing to file
  console.log(mdString);

  fs.writeFile("test.md", mdString, (err) => {
    console.log(err);
  });
})();

*/


/*
(async () => {
  const response = await notion.pages.retrieve({ page_id: pageId });
  console.log(response);
})();
*/



(async () => {
  const response = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });

  var output = ""
  response.results.forEach(function(block) {
    console.log(block);

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
            case '💡': admonition = 'tip'; break;
            case '⚠️': admonition = 'warning'; break;
          }
        }
        let b = n2m.blockToMarkdown(block)
        let title = ''
        let s = b.split('\n')
        let f = s[0]
        s.shift()
        let body = s.join('\n')
        console.log("yyyyy " + f);
        if (f.startsWith('“') && f.endsWith('”')) {
          title = f.replaceAll('“', '')
          title = title.replaceAll('”', '')
        }
        output += `!!! ${admonition} "${title}"\n    ${body}\n`
        break
      }
      case 'child_page': {
        break
      }
      case 'table': {
        //console.log(block[block.type])
        //table rows are children
        break
      }
      default: {
        output += n2m.blockToMarkdown(block) + "\n"
      }
    }


  });

  fs.writeFile("test.md", output, (err) => {
    if (err) console.log(err)
  });

  console.log(output);

})();
