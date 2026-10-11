#!/bin/bash
# usage: sheets.sh [category-slug ...]  -> renders all thumbnails to .tmp-thumbs and builds per-category sheets in .tmp-sheets
cd /home/ina/LowPoly64
export TMPDIR=$PWD/.tmp-chrome PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium
mkdir -p .tmp-thumbs .tmp-sheets .tmp-chrome
node scripts/build-template-thumbnails.mjs --out .tmp-thumbs --width 288 --height 224 --format png --allow-failures > .tmp-thumbs.log 2>&1
echo "render: $(tail -1 .tmp-thumbs.log) failed=$(grep -c '\[failed\]' .tmp-thumbs.log)"
node -e '
const m=require("./.tmp-thumbs/manifest.json");const by={};for(const t of m.templates)(by[t.category]=by[t.category]||[]).push(t);
const want=process.argv.slice(1);const {execFileSync}=require("child_process");
for(const [cat,list] of Object.entries(by)){const slug=cat.normalize("NFD").replace(/[^a-zA-Z0-9]/g,"").toLowerCase();if(want.length&&!want.includes(slug))continue;
 const args=[];for(const t of list){args.push("-label",t.id,".tmp-thumbs/"+t.file);}
 execFileSync("montage",[...args,"-tile","6x","-geometry","288x224+6+6","-background","#1b2230","-fill","white","-pointsize","14",".tmp-sheets/"+slug+".png"]);console.log("sheet",slug,list.length);}' "$@"
