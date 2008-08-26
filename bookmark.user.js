// ==UserScript==
// @name           bookmark
// @namespace      http://gomaxfire.dnsdojo.com/
// @require        http://jqueryjs.googlecode.com/files/jquery-1.2.6.js
// @require        http://github.com/gotin/chain/tree/master/chain.js?raw=true
// @require        http://github.com/gotin/gm_utils/tree/master/util2.js?raw=true
// @description    bookmark
// @include        *

const COLOR='pink';
const COLORED_CLASS="__colored__";

if(unsafeWindow.parent == unsafeWindow){
//  GM_addStyle("." + COLORED_CLASS + " {background-color:" + COLOR + ";}");
  Keybind.add("C-b", function(){entry('');});
  Keybind.add("C-v", show_current_page_markers);
  Keybind.add("C-l", show_bookmarks);
  Keybind.add("C-escape", hide_markers);
}

var bodyClone = null;
var view_status = false;

var bookmarkList = null;

function show_bookmarks(){
  if(bookmarkList){
    $(bookmarkList).remove();
    bookmarkList = null;
    return;
  }
  bookmarkList = $div({},{position:"fixed",zIndex:"999999", bottom:"0", left:"0",backgroundColor:"#FFF",border:"1px dashed blue", margin:"0", padding:"2px"})();
  load_bookmarks()
    .list
    .forEach(
      function(bookmark){
        console.log(uneval(bookmark));
        var pStyle = {margin:"0", padding:"2px"};
        if(document.location.href == bookmark.url){
          pStyle.backgroundColor = "pink";
        }
        var p =$p({},pStyle);
        $add(bookmarkList,
             p($a({href:bookmark.url,textContent:bookmark.title},{color:"blue",textDecoration:"underline",fontSize:"10px",fontFamily:"verdana"})()));
      });
  $add(document.body, bookmarkList);
}



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
              title:document.title,
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
  var targets = {};
  hide_markers();
  get_current_page_bookmarks()
    .forEach(
      function(bookmark){
        show_markers(bookmark.markers, targets);
      });

  for(var path in targets){
    colorText(targets[path]);
  }


  view_status = true;

  function colorText(nodeInfo){
    var node =nodeInfo.node;
    var origE = node.textContent.length;
    var s = nodeInfo.s;
    var e = nodeInfo.e;
    if(0 < s && e < origE ){
      var clone=node.cloneNode(true);
      var clone2=node.cloneNode(true);
      var text = node.textContent;
      var t1 = text.substring(0, s);
      var t2 = text.substring(s, e);
      var t3 = text.substring(e);
      node.textContent = t1;
      clone.textContent = t2;
      clone2.textContent = t3;
      node.parentNode.insertBefore(clone2, node.nextSibling);
      node.parentNode.insertBefore(clone, clone2);
      wrapColoredSpan(clone);
    } else if(0 < s){
      var clone=node.cloneNode(true);
      var text = node.textContent;
      var t1 = text.substring(0, s);
      var t2 = text.substring(s);
      node.textContent = t1;
      clone.textContent = t2;
      node.parentNode.insertBefore(clone, node.nextSibling);
      wrapColoredSpan(clone);
    } else if(e < origE){
      var clone=node.cloneNode(true);
      var text = node.textContent;
      var t1 = text.substring(0, e);
      var t2 = text.substring(e);
      node.textContent = t1;
      clone.textContent = t2;
      node.parentNode.insertBefore(clone, node.nextSibling);
      wrapColoredSpan(node);
    } else {
      wrapColoredSpan(node);
    }
  }
}

//var spans = [];
function show_markers(markers, targets){
  markers.forEach(function(marker){
                    show_marker(marker, targets);
                  });
}

function hide_markers(){
  if(bodyClone){
    $rm_content(document.body);
    $mv_content(bodyClone, document.body);
  }
  bodyClone = document.body.cloneNode(true);
  //bodyClone = make_linked_clone(document.body);
  view_status = false;
}

function make_linked_clone(node){
  var clone = node.cloneNode(false);
  var parentClones =node.parentNode.__clones__;
  var cloneParent = parentClones && parentClones[0];
  if(cloneParent) cloneParent.appendChild(clone);
  clone.__orig__ = node;
  node.__clones__ = [clone];
  if(node.nodeType==1){
    var children = node.childNodes;
    for(var i=0,l=children.length;i<l;i++){
      make_linked_clone(children[i]);
    }
  }
}

function show_marker(marker, targets){
  var sc = $X(marker.startContainerPath)[0];
  var so = marker.startOffset;
  var ec = $X(marker.endContainerPath)[0];
  var eo = marker.endOffset;
  var ecParent = ec.parentNode;
  try{
    setColor(sc);
  }catch(e){
  //  console.log(e);
  }

  function setColor(node){
    if(!node)return; // finish;
    if(node==sc && sc == ec){
      if(node.nodeType==3){
        addTarget(node, so, eo);
      }
      return; //finish
    } else if(node==sc){
      if(node.nodeType==3){
        addTarget(node, so);
      }
    } else if(node == ec){
      if(node.nodeType == 3){
        addTarget(node, 0, eo);
      }
      return; // finish
    } else {
      if(node.nodeType==1 && !node.firstChild ){
        if(node.tagName=="IMG"){
          try{
          var pos = $position(node);
          var width = $(node).width();
          var height = $(node).height();
            $add(document.body, $div({},{position:"absolute", left:pos[0]+"px", top:pos[1]+"px", backgroundColor:COLOR, opacity:"0.5", zIndex:999999,width:width+"px",height:height+"px"})());
          }catch(e){
            console.log(e);
          }
        } else {
          $(node).css("background-color",COLOR);
          $(node).addClass(COLORED_CLASS);
        }
      } else if(node.nodeType==3 && !$(node.parentNode).hasClass(COLORED_CLASS)){
        addTarget(node);
      }
    }
    doNext(node);
  }

  function doNext(node, dontGoChild){
    if(!node) return;
    if(!dontGoChild && node.firstChild){
      setColor(node.firstChild);
    } else if(node.nextSibling){
      setColor(node.nextSibling);
    } else {
      doNext(node.parentNode, true);
    }
  }


  function addTarget(node, s, e){
    var path = getXPath(node);
    if(s == undefined) s = 0;
    if(e == undefined) e = node.textContent.length;
    if(!targets[path]){
      targets[path] = {node:node, text:node.textContent};
    }
    if(!("s" in targets[path]) ||targets[path].s > s){
      targets[path].s = s;
    }
    if(!("e" in targets[path]) ||targets[path].e < e){
      targets[path].e = e;
    }
  }
}

function wrapColoredSpan(node){
  var r = document.createRange();
  r.selectNode(node);
  var span = $span({className:COLORED_CLASS},{backgroundColor:COLOR})();
  r.surroundContents(span);
  r.detach();
  return span;
}

function isNodeWrapper(wrapper , node, offset){
  var range = document.createRange();
  range.selectNode(wrapper);
  var ret = range.isPointInRange(node, offset);
  range.detach();
  return ret;
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
//  return ({list:[],url_index:{},ymd_index:{}});
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

