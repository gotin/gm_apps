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
  var sc = $X(marker.startContainerPath)[0];
  var so = marker.startOffset;
  var ec = $X(marker.endContainerPath)[0];
  var eo = marker.endOffset;
  var ecParent = ec.parentNode;

  var walker =
    document.createTreeWalker(document.body,
                              -1,
                              { acceptNode: function(node) { return 1; } },
                              false);
  walker.currentNode = sc;
  try{
    setColor(walker);
  }catch(e){
  //  console.log(e);
  }

  function setColor(walker){
    var node=walker.currentNode;
    if(!node)return; // finish;
    if(node==sc && sc == ec){
      if(node.nodeType==3){
        var clone=node.cloneNode(true);
        var clone2=node.cloneNode(true);
        var text = node.textContent;
        var t1 = text.substring(0, so);
        var t2 = text.substring(so, eo);
        var t3 = text.substring(eo);
        node.textContent = t1;
        clone.textContent = t2;
        clone2.textContent = t3;
        node.parentNode.insertBefore(clone2, node.nextSibling);
        node.parentNode.insertBefore(clone, clone2);
        wrapColoredSpan(clone);
      }
      return; //finish
    } else if(node==sc){
      if(node.nodeType==3){
        var clone=node.cloneNode(true);
        var text = node.textContent;
        var t1 = text.substring(0, so);
        var t2 = text.substring(so);
        node.textContent = t1;
        clone.textContent = t2;
        node.parentNode.insertBefore(clone, node.nextSibling);
        wrapColoredSpan(clone);
      }
    } else if(node == ec){
      if(node.nodeType == 3){
        var clone=node.cloneNode(true);
        var text = node.textContent;
        var t1 = text.substring(0, eo);
        var t2 = text.substring(eo);
        node.textContent = t1;
        clone.textContent = t2;
        node.parentNode.insertBefore(clone, node.nextSibling);
        wrapColoredSpan(node);
      }
      return; // finish
    } else {
      if(node.nodeType==1 && (!node.firstChild ||!isNodeWrapper(node, ec, eo) )){
        node.style.backgroundColor = COLOR;
      } else if(node.nodeType==3 && isNodeWrapper(node.parentNode, ec, eo)){
        node = wrapColoredSpan(node);
      }
    }
    if(node.nodeType==1){
      var children = node.childNodes;
      for(var i=0,l=children.length;i<l;i++){
        var child = children[i];
        setColor(child, walker);
      }
    }
    walker.currentNode = node;
    walker.nextNode();
    setColor(walker);
  }

  function wrapColoredSpan(node){
    var r = document.createRange();
    r.selectNode(node);
    var span = $span({},{backgroundColor:COLOR})();
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

