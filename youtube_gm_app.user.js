// ==UserScript==
// @name           youtube_gm_app
// @namespace      http://gomaxfire.dnsdojo.com/
// @require        http://jqueryjs.googlecode.com/files/jquery-1.2.6.js
// @require        http://github.com/gotin/chain/tree/master/chain.js?raw=true
// @require        http://github.com/gotin/gm_utils/tree/master/util2.js?raw=true
// @description    simple sample of youtube api
// @include        *
// ==/UserScript==
const YOUTUBE_API = "http://gdata.youtube.com/feeds/api";
var list = null;
var search_text = "";
if(unsafeWindow.parent==unsafeWindow){
  GM_registerMenuCommand("view most viewed", popular, "v", "shift", "v");
  GM_registerMenuCommand("view most recent", recent, "r", "shift", "r");
  Keybind.add("S-v", popular);
  Keybind.add("S-r", recent);
}

function popular(){
  search_text = "";
  view_movies(YOUTUBE_API+"/standardfeeds/most_viewed?time=today");
}
function recent(){
  search_text = "";
  view_movies(YOUTUBE_API+"/standardfeeds/most_recent");
}

function view_movies(url){
  $C.xhr(url)
  (
    parse_youtube_feed
  )(
    $C.error(
      function(e){
        // console.log(e);
        return [];
      }
    )
  )(
    view_thumbnails
  )();
}

function view_thumbnails(movies){
  if(list){
    $(list).slideUp("fast", function(){$(this).remove(); list = null;view_thumbnails(movies);});
    return;
  }
  var button = $input({type:"button",value:"x"})();
  var select = $select({},{marginLeft:"10px"})
  ($option({value:"select",textContent:"select"})(),
   $option({value:"popular",textContent:"popular today"})(),
   $option({value:"recent",textContent:"recent"})());

  $(select).change(function(){
                     if(select.value == "popular"){
                       popular();
                     } else if(select.value == "recent"){
                       recent();
                     }
                   });
  var search_field = $input({type:"text", value:search_text})();
  var search_button = $input({type:"button",value:"search"})();
  var search_form = $form({},{display:"inline", paddingLeft:"10px"})(search_field, search_button, select);

  $(search_form)
    .submit(
      function(){
        search_text = search_field.value;
        view_movies(YOUTUBE_API+"/videos/?" +
                    object2query(
                      {
                        vq:$(search_field).attr("value"),
                        orderby:"published",
                        "max-results":50,
                        format:5,
                        racy:"include"
                      }));
      });
  list = $div({},
              {
                width:"100%",
                height:"auto",
                position:"absolute",
                top:"0",
                left:"0",
                color:"#FFF",
                zIndex:"99999999",
                backgroundColor:"#000",
                with:"500px",
                textAlign:"left"
              }
             )
  (button,
   $span({textContent:movies.title},{margin:"0",padding:"0",fontSize:"12px"})(),
   search_form
  );


  $(button).click(function(){$(list).slideUp("slow",function(){$(this).remove();});});
  $add(document.body, list);

  movies.forEach(function(movie){
                   $add(list,
                        $div({},{backgroundColor:"#333",
                                 margin:"2px 0",
                                 width:"500px"//,
                                 // cssFloat:"left"
                                })
                        (
                          $div({textContent:movie.title},
                               {textAlign:"left",
                                padding:"5px 2px 2px",
                                margin:"0",
                                fontSize:"12px"})(
                            $span({},{color:"#C66",fontSize:"10px"})(" [" + movie.duration + " sec]"),
                            $span({},{color:"#66C",fontSize:"10px"})(" published:" + movie.published)
                          ),
                          $div({},{textAlign:"center"})(make_thumbs(movie))));
                 });
  window.scrollTo(0,0);

  function make_thumbs(movie){
    return  movie.thumbs.map(
      function(thumb){
        var width = thumb.width;
        var height = thumb.height;
        if(width > 200 || height > 200){
          return "";
        } else {
          var img = $img({src:thumb.url,width:thumb.width,height:thumb.height},
                         {margin:"2px",cursor:"pointer"})();
          var player = $embed({
                                src:movie.url+"&autoplay=1&fmt=18",
                                    type:movie.type,
                                width:"425",
                                height:"350"
                              })();
          var button =  $input({
                                 type:"button",
                                 value:"close movie"
                               })();
          var content = $div({},{display:"none"})(player,
                               $div({},
                                    {
                                      margin:"0",
                                      padding:"0",
                                      textAlign:"center",
                                      width:"425px",
                                      height:"20px"
                                    })(button));
          $(button).click(
            function(){
              $(content).slideUp("slow",function(){$(this).remove();});
            });
          $(img).click(
            function(){
              $(this).parent().prepend(content);
              $(content).slideDown("slow");
            });
          return img;
        }
      });
  }
}

function parse_youtube_feed(text){
  var domParser = new DOMParser();
  var doc = domParser.parseFromString(text, "text/xml");
  var entries = doc.getElementsByTagName("entry");
  var movies = [];
  for(var i=0,l=entries.length;i<l;i++){
    var entry = entries[i];
    var contentNodes = entry.getElementsByTagName("media:content");
    var content = {};
    for(var j=0,l2=contentNodes.length;j<l2;j++){
      var contentNode = contentNodes[j];
      if(contentNode.getAttribute("yt:format")=="5"){
        content = {
          url:contentNode.getAttribute("url"),
          type:contentNode.getAttribute("type")
        };
        break;
      }
    }
    if(!content.url)continue;
    var thumbNodes = entry.getElementsByTagName("media:thumbnail");
    var thumbs = [];
    for(var k=0,l3=thumbNodes.length;k<l3;k++){
      var thumbNode = thumbNodes[k];
      thumbs.push({
                    url:thumbNode.getAttribute("url"),
                    width:thumbNode.getAttribute("width"),
                    height:thumbNode.getAttribute("height"),
                    time:thumbNode.getAttribute("time")
                  });
    }
    var published = new Date.W3CDTF();
    published.setW3CDTF(entry.getElementsByTagName("published")[0].textContent);
    var updated =  new Date.W3CDTF();
    updated.setW3CDTF(entry.getElementsByTagName("updated")[0].textContent);
    var duration = parseInt(entry.getElementsByTagName("yt:duration")[0].getAttribute("seconds"));
    movies.push({
                  title:entry.getElementsByTagName("title")[0].textContent,
                  published:published,
                  updated:updated,
                  duration:duration,
                  url:content.url,
                  type:content.type,
                  thumbs:thumbs
                });
  }
  try{
    movies.title = doc.getElementsByTagName("title")[0].textContent;
  }catch(e){
    // console.log(e);
  }
  return movies;
}