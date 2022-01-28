import { Client } from "@notionhq/client"
import { NotionToMarkdown } from "notion-to-md";
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'
import config from 'config'
import { parseData } from './parse.js'

// Getting Default Values
const secret_notion_key = config.get('secret_notion_key')
const page_id = config.get('page_id')
const dist = config.get('output_destination')


if (!secret_notion_key) {
  console.log("Please check your Notion Key");
  process.exit(0)
}
if (!page_id) {
  console.log("Please check your Page ID");
  process.exit(0)
}

// Initialising Notion
const notion = new Client({ auth: secret_notion_key });
const n2m = new NotionToMarkdown({ notionClient: notion });

async function getData(id, name ='') {
  console.log("Getting Data from:", id, name)
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


// Remove and Make Dir
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);

var output_path = [dist]
async function exportFiles(response, subdir=false, level=0) {

  // Make Sub-Directories according to Level
  if (subdir) {
    output_path = output_path.slice(0, level+1)           // slice path, if sub sub page exists, and sub is next
    output_path[level] = slugify(subdir, {lower: true})   // add sub directory
  }

  let p = path.join(...output_path)
  if (!fs.existsSync(p)) {
    console.log(`Creating Directory: ${p}`);
    fs.mkdirSync(p)
  }

  let file_content = await parseData(response, output_path)
  let file_path = path.join(...output_path, 'index.md')
  fs.writeFileSync(file_path, file_content)
  console.log(`Writing File: ${file_path}`);

  for (const block of response.results) {
    if (block.child_page && block.has_children) {
      // needs await !!!
      await exportFiles(block.child.response, block.child_page.title, level+1) // increase level
    }
  }
}

get(page_id).then(pages => {
  //console.log(pages.response);
  exportFiles(pages.response)
})
