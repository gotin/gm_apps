// ==UserScript==
// @name           bookmark
// @namespace      http://gomaxfire.dnsdojo.com/
// @require        http://jqueryjs.googlecode.com/files/jquery-1.2.6.js
// @require        http://github.com/gotin/chain/tree/master/chain.js?raw=true
// @require        http://github.com/gotin/gm_utils/tree/master/util2.js?raw=true
// @description    bookmark
// @include        *

if(unsafeWindow.parent == unsafeWindow){
  Keybind.add("C-b", function(){entry('');});
  Keybind.add("C-v", show_current_page_markers);
  Keybind.add("C-escape", hide_markers);
}

const COLOR='pink';
var bodyClone = null;
var view_status = false;

function entry(comment){
  if(view_status){
    alert("Sorry, bookmarking is disable in mark view mode.");
    return;
  }
  var url = document.location.href;
  var markers = get_markers();
  var bookmarks = load_bookmarks();
  var list = bookmarks.list;
  var index = list.length;
  var now = new Date();
  var now_time = now.getTime();
  list.push({
              url:url,
              markers:markers,
              created_at:now_time,
              comment:comment
            });
  var url_index =bookmarks.url_index[url]||(bookmarks.url_index[url]={});
  url_index[index]=true;
  var now_year = now.getFullYear();
  var now_month = now.getMonth();
  var now_date = now.getDate();
  var year_index = bookmarks.ymd_index[now_year] || (bookmarks.ymd_index[now_year]={});
  var month_index = year_index[now_month] ||(year_index[now_month]={});
  var date_index = month_index[now_date] || (month_index[now_date]=[]);
  date_index[index] = true;
  save_bookmarks(bookmarks);

}

function show_current_page_markers(){
  hide_markers();
  get_current_page_bookmarks()
    .forEach(
      function(bookmark){
        show_markers(bookmark.markers);
      });
  view_status = true;

}

//var spans = [];
function show_markers(markers){
  markers.forEach(function(marker){
                    show_marker(marker);
                  });
}

function hide_markers(){
  if(bodyClone){
    $rm_content(document.body);
    $mv_content(bodyClone, document.body);
  }
  bodyClone = document.body.cloneNode(true);
  view_status = false;
}

function show_marker(marker){
  var range =document.createRange();
  try{
    range.setStart($X(marker.startContainerPath)[0],marker.startOffset);
    range.setEnd($X(marker.endContainerPath)[0],marker.endOffset);
    var span = $span()();
    range.surroundContents(span);
    setColor(span,COLOR);
    var last = span.childNodes.length-1;
    for(var i=0,c;c=span.firstChild;i++){
      console.log(i+"/"+last);
      if(i==0 && marker.startOffset > 0 &&
         c.nodeName == span.previousSibling.nodeName){
        if(c.nodeType==3){
          var tmp = $span()(c);
          setColor(tmp, COLOR);
          span.parentNode.insertBefore(tmp, span);
        } else {
          var tmp = $span()();
          $mv_content(c, tmp);
          $rm(c);
          setColor(tmp, COLOR);
          span.previousSibling.appendChild(tmp);
        }
      } else if(i==last &&
                 c.nodeName == span.nextSibling.nodeName){
         var next = span.nextSibling;
        if(c.nodeType==3){
          var tmp = $span()(c);
          setColor(tmp, COLOR);
          span.parentNode.insertBefore(tmp, next);
          console.log("last text");
        } else {
          var tmp = $span()();
          $mv_content(c, tmp);
          $rm(c);
          setColor(tmp, COLOR);
          next.insertBefore(tmp, next.firstChild);
          console.log("last node");
        }
      } else {
        span.parentNode.insertBefore(c, span);
      }
    }
  }catch(e){
    console.log(e);
    console.log(uneval(marker));
  }
}

function setColor(node, color){
  if(node.nodeType==1){
    node.style.backgroundColor = color;
    var children = node.childNodes;
    for(var i=0,l=children.length;i<l;i++){
      setColor(children[i], color);
    }
  }

}

function get_current_page_bookmarks(){
  var bookmarks = load_bookmarks();
  var indexs = bookmarks.url_index[document.location.href];
  var list = bookmarks.list;
  var results = [];
  for(var index in indexs){
    results.push(list[index]);
  }
  return results;
}

function load_bookmarks(){
  var bookmarks = eval(GM_getValue("bookmarks","({list:[],url_index:{},ymd_index:{}})"));
  return bookmarks;
  //return ({list:[],url_index:{},ymd_index:{}});
}

function save_bookmarks(bookmarks){
  GM_setValue("bookmarks", uneval(bookmarks));
}

function get_markers(){
  var selection = window.getSelection();
  var count = selection.rangeCount;
  var markers = [];
  for(var i=0;i<count;i++){
    markers.push(get_marker(selection.getRangeAt(i)));
  }
  return markers;
}

function get_marker(range){
  return {
    startContainerPath:getXPath(range.startContainer),
    endContainerPath:getXPath(range.endContainer),
    startOffset:range.startOffset,
    endOffset:range.endOffset,
    text:range.toString()
  };
}

