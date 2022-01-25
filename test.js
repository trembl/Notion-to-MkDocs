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

  return {response, child_ids, id, children}
}


async function get() {
  return await getData(pageId)
}

get().then(page => {

  page.response.results.forEach(block => {
    if (block.type === 'child_page') {
      console.log(block);
      console.log(block.child.response);
    }
  });


  // console.log(page.response);
})
