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
const pageId = process.env.PAGE_ID
const notion = new Client({ auth: notion_key });
const n2m = new NotionToMarkdown({ notionClient: notion });

async function getData(id) {
  console.log("getData", id)
  const response = await notion.blocks.children.list({
    block_id: id,
    page_size: 100,
  });

  var output = ""

  // loop over block
  for (const block of response.results) {
    var b = await n2m.blockToMarkdown(block)
    if (b) output += `${b}\n\n`

  }

  return output
}

getData(pageId).then(o => {
  console.log(o);
  console.log("xxx Done");
})




/*
export async function parseData(response, output_path) {
  var output = ""
  response.results.forEach(async function(block) {
      output += await n2m.blockToMarkdown(block) + "\n\n"
    }
  });
  return output
}
*/
