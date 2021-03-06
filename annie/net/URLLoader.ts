/**
 * @module annie
 */
namespace annie {
    var Eval:any=eval.bind(window);
    /**
     * 资源加载类,后台请求,加载资源和后台交互都可以使用此类
     * @class annie.URLLoader
     * @extends annie.EventDispatcher
     * @public
     * @since 1.0.0
     */
    export class URLLoader extends EventDispatcher {
        /**
         * @param type text json js xml image sound css svg video unKnow
         */
        public constructor(){
            super();
        }
        /**
         * 取消加载
         * @method loadCancel
         * @public
         * @since 1.0.0
         */
        public loadCancel():void {
            var s = this;
            if (s._req) {
                s._req.abort();
                //s._req = null;
            }
        }
        private _req:XMLHttpRequest;

        /**
         * 加载或请求数据
         * @method load
         * @public
         * @since 1.0.0
         * @param {string} url
         * @param {boolean} isBinaryData 是否向后台发送二进制数据包手blob byteArray等
         */
        public load(url:string, isBinaryData:boolean = false):void {
            var s = this;
            s.loadCancel();
            if (s.responseType == null || s.responseType == "") {
                //看看是什么后缀
                var urlSplit = url.split(".");
                var extStr = urlSplit[urlSplit.length - 1];
                var ext = extStr.split("?")[0].toLocaleLowerCase();
                if (ext == "mp3" || ext == "ogg" || ext == "wav") {
                    s.responseType = "sound";
                } else if (ext == "jpg" || ext == "jpeg" || ext == "png" || ext == "gif") {
                    s.responseType = "image";
                } else if (ext == "css") {
                    s.responseType = "css";
                } else if (ext == "mp4") {
                    s.responseType = "video";
                } else if (ext == "svg") {
                    s.responseType = "svg";
                } else if (ext == "xml") {
                    s.responseType = "xml";
                } else if (ext == "json") {
                    s.responseType = "json";
                } else if (ext == "txt") {
                    s.responseType = "text";
                } else if (ext == "js") {
                    s.responseType = "js";
                } else {
                    s.responseType = "unKnow";
                }
            }
            var req:any=null;
            if(!s._req){
                s._req=new XMLHttpRequest();
                req=s._req;
                req.timeout = 5000;
                req.withCredentials = false;
                req.onprogress = function (event:any):void {
                    if (!event || event.loaded > 0 && event.total == 0) {
                        return; // Sometimes we get no "total", so just ignore the progress event.
                    }
                    s.dispatchEvent("onProgress",{loadedBytes:event.loaded,totalBytes:event.total});
                };
                req.onerror = function (event:any):void {
                    reSendTimes++;
                    if(reSendTimes>3){
                        s.dispatchEvent("onError", event["message"]);
                    }else {
                        //断线重连
                        req.abort();
                        if (!s.data) {
                            req.send();
                        } else {
                            if (isBinaryData) {
                                req.send(s.data);
                            } else {
                                req.send(s._fqs(s.data, null));
                            }
                        }
                    }
                };
                req.onreadystatechange = function (event:any):void {
                    var t = event.target;
                    if (t["readyState"] == 4) {
                        var e:Event = new Event("onComplete");
                        var result = t["response"];
                        e.data = {type: s.responseType, response: null};
                        var item:any;
                        switch (s.responseType) {
                            case "css":
                                item = document.createElement("link");
                                item.rel = "stylesheet";
                                item.href = s.url;
                                break;
                            case "image":
                            case "sound":
                            case "video":
                                var isBlob:boolean=true;
                                if(s.responseType=="image"){
                                    item = document.createElement("img");
                                    item.onload = function () {
                                        if(isBlob) {
                                            URL.revokeObjectURL(item.src);
                                        }
                                        item.onload = null;
                                    };
                                }else{
                                    if(s.responseType=="sound") {
                                        item = document.createElement("AUDIO");
                                    }else if(s.responseType=="video") {
                                        item = document.createElement("VIDEO");
                                    }
                                    item.preload = true;
                                    item.load();
                                    item.onloadeddata = function (){
                                        if(isBlob) {
                                            //执行下面的代码android有问题，会闪退
                                            //URL.revokeObjectURL(item.src);
                                        }
                                        item.onloadeddata = null;
                                    };
                                }
                                try{
                                    item.src = URL.createObjectURL(result);
                                }catch(err){
                                    isBlob=false;
                                    item.src = s.url;
                                }
                                break;
                            case "json":
                                item = JSON.parse(result);
                                break;
                            case "xml":
                                item = t["responseXML"];
                                break;
                            case "js":
                                Eval(result);
                                break;
                            case "text":
                            case "unKnow":
                            default:
                                item = result;
                                break;
                        }
                        e.data["response"] = item;
                        s.data = null;
                        s.responseType = "";
                        //req.onerror = null;
                        //s._req.onreadystatechange=null;
                        //req.onprogress = null;
                        s.dispatchEvent(e);
                    }
                };
            }else {
                req = s._req;
            }
            var reSendTimes=0;
            if (s.data && s.method.toLocaleLowerCase() == "get") {
                s.url = s._fus(url, s.data);
                s.data = null;
            } else {
                s.url = url;
            }
            if (s.responseType == "image" || s.responseType == "sound" || s.responseType == "video") {
                req.responseType = "blob";
            }else{
                req.responseType ="text";
            }
            req.open(s.method, s.url, true);
            if (!s.data) {
                req.send();
            } else {
                req.setRequestHeader("Content-type","application/x-www-form-urlencoded;charset=UTF-8");
                if (isBinaryData) {
                    req.send(s.data);
                } else {
                    req.send(s._fqs(s.data, null));
                }
            }
            /*req.onloadstart = function (e) {
             s.dispatchEvent("onStart");
             };*/
        }
        /**
         * 后台返回来的数据类弄
         * @property responseType
         * @type {string}
         * @default null
         * @public
         * @since 1.0.0
         */
        public responseType:string = null;
        /**
         * 请求的url地址
         * @property url
         * @public
         * @since 1.0.0
         * @type {string}
         */
        public url:string = "";
        /**
         * 请求后台的类型 get post
         * @property method
         * @type {string}
         * @default get
         * @public
         * @since 1.0.0
         */
        public method:string = "get";
        /**
         * 需要像后台传送的数据对象
         * @property data
         * @public
         * @since 1.0.0
         * @default null
         * @type {Object}
         */
        public data:Object = null;
        /**
         * 格式化post请求参数
         * @method _fqs
         * @param data
         * @param query
         * @return {string}
         * @private
         * @since 1.0.0
         */
        private _fqs = function (data:any, query:any):string {
            var params:any = [];
            if (data) {
                for (var n in data) {
                    params.push(encodeURIComponent(n) + "=" + encodeURIComponent(data[n]));
                }
            }
            if (query) {
                params = params.concat(query);
            }
            return params.join("&");
        };
        //formatURIString
        /**
         * 格式化get 请求参数
         * @method _fus
         * @param src
         * @param data
         * @return {any}
         * @private
         */
        private _fus = function (src:any, data:any):string {
            var s = this;
            if (data == null || data == "") {
                return src;
            }
            var query:any = [];
            var idx = src.indexOf("?");
            if (idx != -1) {
                var q = src.slice(idx + 1);
                query = query.concat(q.split("&"));
                return src.slice(0, idx) + "?" + s._fqs(data, query);
            } else {
                return src + "?" + s._fqs(data, query);
            }
        };
    }
}