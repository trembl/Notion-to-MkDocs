import { Client } from "@notionhq/client"
import { NotionToMarkdown } from "notion-to-md";
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'
import { parseData } from './parse.js'



const notion_key = process.env.NOTION_KEY
const pageId = process.env.PAGE_ID
const dist = "dist"

const notion = new Client({ auth: notion_key });
const n2m = new NotionToMarkdown({ notionClient: notion });

if (!notion_key) {
  console.log("Please check your Notion Key");
  process.exit(0)
}
if (!pageId) {
  console.log("Please check your Page ID");
  process.exit(0)
}



async function getData(id, name ='') {
  console.log("Get Data from:", id, name)
  const response = await notion.blocks.children.list({
    block_id: id,
    page_size: 100,
  });

  // Recursive Loop to get Child Pages
  for (const block of response.results) {
    if (block.child_page && block.has_children) {
      block.child = await getData(block.id, block.child_page.title)
    }
  }

  // More Blocks
  if (response.has_more) {
    console.log("More Blocks...")
    const moreBlocks = await getData(response.next_cursor, "More than 100 Blocks, Fetching...")
    response.results = response.results.concat(moreBlocks) // // add to results
  }

  return {response, id}
}


async function get(id, name) {
  return await getData(id, name)
}


var output_path = [dist]
// Remove and Make Dir
fs.rmSync(path.join(...output_path), { recursive: true, force: true });
fs.mkdirSync(path.join(...output_path));

async function exportFiles(response, dirName, level=1) {
  dirName = slugify(dirName, {lower: true})
  output_path = output_path.slice(0, level+1)
  output_path[level] = dirName

  let p = path.join(...output_path)
  if (!fs.existsSync(p)) fs.mkdirSync(p)

  let md = await parseData(response, output_path)
  console.log("exportFiles md", md);

  let filePath = path.join(...output_path, 'index.md')
  console.log("exportFiles filePath", filePath);
  fs.writeFile(filePath, md, err => {})

  response.results.forEach(block => {
    if (block.has_children && block.child_page) {
      let t = block.child_page.title
      exportFiles(block.child.response, t, level+1)
    }
  })
}

get(pageId).then(pages => {
  var path = "FabAcademy-2022"
  exportFiles(pages.response, path)
})
