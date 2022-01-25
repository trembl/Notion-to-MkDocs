import { Client } from "@notionhq/client"
import { NotionToMarkdown } from "notion-to-md";
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'
import { parseData } from './parse.js';


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



async function getData(id) {
  console.log("getData", id)
  const response = await notion.blocks.children.list({
    block_id: id,
    page_size: 100,
  });
  let child_ids = []
  response.results.forEach(function(block) {
    if (block.has_children) child_ids.push(block.id)
  })

  const promises = child_ids.map(async id => {
    return await getData(id)
  })
  const children = await Promise.all(promises)

  response.results.forEach(block => {
    if (block.has_children) {
      block.child = children.find(c => c.id === block.id)
    }
  })

  return {response, id}
}


async function get() {
  return await getData(pageId)
}


var output_path = [dist]

function exportFiles(response, dirName, level=1) {
  dirName = slugify(dirName, {lower: true})
  output_path = output_path.slice(0, level+1)
  output_path[level] = dirName
  let p = path.join(...output_path)
  if (!fs.existsSync(p)) fs.mkdirSync(p)
  let md = parseData(response)
  let filePath = path.join(...output_path, 'index.md')
  console.log("exportFiles", filePath);
  fs.writeFile(filePath, md, err => {})
  response.results.forEach(block => {
    if (block.has_children && block.child_page) {
      let t = block.child_page.title
      exportFiles(block.child.response, t, level+1)
    }
  })
}

get().then(pages => {
  exportFiles(pages.response, "FabAcademy-2022")
})
