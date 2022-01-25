import { Client } from "@notionhq/client"
import { NotionToMarkdown } from "notion-to-md";
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

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


//console.log(path.parse('/home/user/dir/file.txt'));
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

// Create path, content object,
var pages = []
var promises = []


async function getData(id, level, title) {
  console.log("getData", id, level, title)
  var child_ids = []

  title = title.map(t => slugify(t, {lower: true}))
  //title.push('index.md')
  const slug = path.join(...title)

  const response = await notion.blocks.children.list({
    block_id: id,
    page_size: 100,
  });

  var output = ""
  response.results.forEach(function(block) {

    //console.log("level: " + level, block.type);
    // console.log(block);

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
      case 'child_page': {
        if (block.has_children) {
          console.log("child_page", block.id);
          /*
          // create folder with block.child_page.title
          fs.mkdir(path.join(__dirname, block.child_page.title), (err) => {
            if (err) return console.error(err);
            console.log('Directory created successfully!');
          });
          */
          child_ids.push(block.id)
          //title[level+1] = block.child_page.title
          //promises.push(getData(block.id, level+1, title))

          /*.then(r => {
            console.log(r);
          })
          */


        }
        break
      }
      case 'table': {
        //console.log(block[block.type])
        //table rows are children
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

  /*
  fs.writeFile("dist/test.md", output, (err) => {
    if (err) console.log(err)
    console.log('FIle created successfully!');

  });
  */
  // console.log(output);
  pages.push(
    {
      id: id,
      slug: slug,
    //  content: output
    }
  )

  return {
    pages: pages,
    child_ids: child_ids
  }
}


getData(pageId, 0, ['FabAcademy 2022']).then((r) => {

    r.child_ids.forEach(child_id => {
      console.log(child_id);
      getData(child_id, 1, ['FabAcademy 2022']).then((s) => {
        console.log(s);
      })
    });
    console.log("Done");
  })
