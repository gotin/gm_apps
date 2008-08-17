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
const MODIFIER={"shift":"S", "control":"C", "meta":"M", "alt":"M" };
const BASE_PARAMETER={
  alt:"json",
  "max-results":50,
  format:5,
  racy:"include"
};
const SETTING = {
  "most_viewed":{
    title:"view most viewed",
    key:"v",
    modify:"shift",
    option:{time:"today"}
  },
  "most_recent":{
    title:"view recent",
    key:"r",
    modify:"shift"
  },
  "top_rated":{
    title:"view top rated",
    key:"t",
    modify:"shift",
    option:{time:"today"}
  },
  "top_favorites":{
    title:"view top favorites",
    key:"f",
    modify:"shift",
    option:{time:"today"}
  },
  "most_linked":{
    title:"view most linked",
    key:"l",
    modify:"shift",
    option:{time:"today"}
  },
  "most_discussed":{
    title:"view most discussed",
    key:"d",
    modify:"shift",
    option:{time:"today"}
  },
  "most_responded":{
    title:"view most responded",
    key:"c",
    modify:"shift",
    option:{time:"today"}
  }
};
const log=(("console" in this) && ("log" in console))?function(s){console.log(s);}:function(s){};
var ui=null;
var body=null;
var current=null;
if(unsafeWindow.parent==unsafeWindow){
  initialize(SETTING);
  Keybind.add("S-escape", close);
  $(window).resize(function(){
                     if(ui && body){
                       $(body).height($(window).height()-30);
                     }
                   });
  Keybind.add("j down".split(" "),
              function(){
                if(body && current){
                  set_current($(current).next("div").get(0));
                }
              });
  Keybind.add("k up".split(" "),
              function(){
                if(body && current){
                  set_current($(current).prev("div").get(0));
                }
              });
  Keybind.add("enter",
              function(){
                if(body && current){
                  current.getElementsByTagName("button")[0].click();
                }
              });
  Keybind.add("escape",
              function(){
                if(body && current){
                  current.getElementsByTagName("input")[0].click();
                }
              });
}

function set_current(div){
  if(!div) return;
  if(current){
    $(current).css("border","none");
  }
  $(div).css("border","2px solid yellow");
  div.getElementsByTagName("button")[0].focus();
  body.scrollTop=div.offsetTop-30;
  current = div;
}

function free_current(div){
}

function standard(id, option){
  var query = copy(BASE_PARAMETER, {});
  copy(option, query);
  view_movies(YOUTUBE_API+"/standardfeeds/" + id + "?" + object2query(query));
}

function copy(from, to){
  if(typeof from == "object"){
    for(var a in from){
      to[a] = from[a];
    }
  }
  return to;
}

function initialize(data){
  for(var id in data){
    var info = data[id];
    var func = info.func = (function(id, option){return function(){standard(id, option);};})(id,info.option);
    GM_registerMenuCommand(info.title, func, info.key, info.modify, info.key);
    var phrase = [info.key];
    info.modify && phrase.unshift(MODIFIER[info.modify]);
    Keybind.add(phrase.join("-"), func);
  }
}

function view_movies(url){
  $C.xhr_json(url)
  (
    $C.error(
      function(e){
        log(uneval(e));
        return [];
      }
    )
  )(
    view_thumbnails
  )();
}

function make_header(){
  var button = $input({type:"button",value:"x"})();
  $(button).click(close);
  var select = $select({},{marginLeft:"10px"})($option({value:"select",textContent:"select"})());

  for(var id in SETTING){
    var info = SETTING[id];
    $add(select,
         $option({value:id,textContent:info.title})());
  }

  $(select).change(function(){
                     var info =SETTING[select.value];
                     info && info.func && info.func();
                   });
  var search_field = $input({type:"text"})();
  var search_button = $input({type:"button",value:"search"})();
  var search_form = $form({},{display:"inline", paddingLeft:"10px"})(search_field, search_button, select);
  $(search_form)
    .submit(
      function(){
        view_movies(YOUTUBE_API+"/videos/?" +
                    object2query(
                      {
                        vq:$(search_field).attr("value"),
                        orderby:"published",
                        "max-results":50,
                        format:5,
                        racy:"include",
                        alt:"json"
                      }));
        return false;
      });
  return  $div({}, {width:"100%",height:"30px" })(button, search_form );


}
function close(){
  ui && $(ui).hide("slow",function(){$(this).remove();ui=null;});
}

function make_ui(){
  if(!ui){
    var head=make_header();
    ui =
      $div({},
           {
             width:"500px",
             height:"auto",
             position:"fixed",
             top:"0",
             left:"0",
             color:"#FFF",
             zIndex:"99999999",
             backgroundColor:"#000",
             textAlign:"left"
           }
          )(head);
    $add(document.body, ui);
  }
  body = $div({}, {width:"100%",height:($(window).height()-30)+"px",overflow:"scroll" } )();
  $add(ui, body);
}

function view_thumbnails(data){
  var feed = data.feed;
  if(body){
    $(body).hide("slow",
                 function(){
                   $(body).remove();
                   body = null;
                   setTimeout(function(){view_thumbnails(data);},0);
                 });
    return;
  }
  try{
    make_ui();
  }catch(e){
    log(uneval(e));
  }
  $add(body, $h3({textContent:feed.title.$t},{fontSize:"12px",border:"none",margin:"0",padding:"0"})());


  feed.entry.forEach(function(entry){
                       var rating = entry.gd$rating;
                       rating = (rating && (rating.average + " / " + rating.numRaters)) ||"not yet";
                       var count = (entry.yt$statistics && entry.yt$statistics.viewCount) || -1;
                       count = ((count < 0) ? "not viewed" :
                                count + "view" + (count == 1 ? "":"s")
                               );

                       $add(body,
                            $div({},{backgroundColor:"#333",
                                     margin:"2px 0",
                                     width:"500px"//,
                                     // cssFloat:"left"
                                    })(
                              $div({textContent:entry.title.$t},
                                   {textAlign:"left",
                                    padding:"5px 2px 2px",
                                    margin:"0",
                                    fontSize:"12px"})(
                                $span({},{color:"#C66",fontSize:"10px"})(" [" + entry.media$group.yt$duration.seconds + " sec]"),
                                $span({},{color:"#6C6",fontSize:"10px"})(" [" + count + "]"),
                                $span({},{color:"#6CC",fontSize:"10px"})(" [rate: " + rating + " ]"),
                                $span({},{color:"#66C",fontSize:"10px"})(" [published: " + entry.published.$t + " ]")
                              ),
                              $div({},{textAlign:"center"})(make_thumbs(entry))));
                     });
  $add(body,$p({},{height:"500px"})());
  current = $(body).children("div").get(0);
  set_current(current);

  function get_content(entry){
    var contents = entry.media$group.media$content;
    var content = null;
    for(var i=0,l=contents.length;i<l;i++){
      var c = contents[i];
      if(c.yt$format==5){
        content = c;
        break;
      }
    }
    return content;
  }

  function make_thumbs(entry){
    var content = get_content(entry);
    var showed = false;
    return  entry.media$group.media$thumbnail.map(
      function(thumb){
        var width = thumb.width;
        var height = thumb.height;
        if(width > 200 || height > 200){
          return "";
        } else {
          var img = $button({},{margin:"0",padding:"0"})($img({src:thumb.url,width:thumb.width,height:thumb.height,border:"0"},
                         {margin:"0",cursor:"pointer"})());
          var player = $embed({
                                src:content.url+"&autoplay=1&fmt=18",
                                type:content.type,
                                width:"425",
                                height:"350"
                              })();
          var button =  $input({
                                 type:"button",
                                 value:"close movie"
                               })();
          var contentDiv = $div({},{display:"none"})(player,
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
              if(!showed)return;
              showed=false;
              $(contentDiv).slideUp("slow",function(){$(this).remove();});
            });
          $(img).click(
            function(){
              if(showed)return;
              showed=true;
              $(this).parent().prepend(contentDiv);
              $(contentDiv).slideDown("slow");
            });
          return img;
        }
      });
  }
}

