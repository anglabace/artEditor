/**
 * 移动端富文本编辑器
 * @author ganzw@gmail.com
 * @url    https://github.com/baixuexiyang/artEditor
 */
$.fn.extend({
    _opt: {
        placeholader: '<p>请输入文章正文内容</p>',
        validHtml: [],
        limitSize: 3,
        showServer: false
    },
    artEditor: function (options) {
        var _this = this,
            styles = {
                "-webkit-user-select": "text",
                "user-select": "text",
                "overflow-y": "auto",
                "text-break": "brak-all",
                "outline": "none",
                "cursor": "text"
            };
        $(this).css(styles).attr("contenteditable", true);
        _this._opt = $.extend(_this._opt, options);
        try {
            $(_this._opt.imgTar).on('change', function (e) {
                var file = e.target.files[0];
                e.target.value = '';
                if (Math.ceil(file.size / 1024 / 1024) > _this._opt.limitSize) {
                    console.error('文件太大');
                    return;
                }
                var reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = function (f) {
                    var data = f.target.result,
                        img = new Image();
                    img.src = f.target.result;
                    if(_this._opt.compressSize && Math.ceil(file.size / 1024 / 1024) > _this._opt.compressSize) {
                        // 解决Firefox读取不到图片高、宽
                        setTimeout(function() {
                            data = _this.compressHandler(img);
                        }, 10);
                    }
                    if (_this._opt.showServer) {
                        _this.upload(data);
                        return;
                    }
                    var image = '<img src="' + data + '" style="width:90%;" />';
                    _this.insertImage(image);
                };
            });
            _this.placeholderHandler();
            _this.pasteHandler();
        } catch (e) {
            console.log(e);
        }
        if (_this._opt.formInputId && $('#' + _this._opt.formInputId)[0]) {
            $(_this).on('input', function () {
                $('#' + _this._opt.formInputId).val(_this.getValue());
            });
        }

        $(this).on('input click', function() {
            setTimeout(function() {
                var selection = window.getSelection ? window.getSelection() : document.selection;
                _this.range = selection.createRange ? selection.createRange() : selection.getRangeAt(0);
            },10);
        });
    },
    compressHandler: function(img) {
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext('2d');
        var tCanvas = document.createElement("canvas");
        var tctx = tCanvas.getContext("2d");
        var initSize = img.src.length;
        var width = img.width;
        var height = img.height;
        var ratio;
        if ((ratio = width * height / 4000000) > 1) {
            ratio = Math.sqrt(ratio);
            width /= ratio;
            height /= ratio;
        } else {
            ratio = 1;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        var count;
        if ((count = width * height / 1000000) > 1) {
            count = ~~(Math.sqrt(count) + 1);
            var nw = ~~(width / count);
            var nh = ~~(height / count);
            tCanvas.width = nw;
            tCanvas.height = nh;
            for (var i = 0; i < count; i++) {
                for (var j = 0; j < count; j++) {
                    tctx.drawImage(img, i * nw * ratio, j * nh * ratio, nw * ratio, nh * ratio, 0, 0, nw, nh);
                    ctx.drawImage(tCanvas, i * nw, j * nh, nw, nh);
                }
            }
        } else {
            ctx.drawImage(img, 0, 0, width, height);
        }
        var ndata = canvas.toDataURL('image/jpeg', 0.1);
        tCanvas.width = tCanvas.height = canvas.width = canvas.height = 0;
        return ndata;
    },
    upload: function (data) {
        var _this = this, filed = _this._opt.uploadField || 'uploadfile';
        $.ajax({
            url: _this._opt.uploadUrl,
            type: 'post',
            data: $.extend(_this._opt.data, {[filed]: data}),
            cache: false,
        })

            .then(function (res) {
                var src = _this._opt.uploadSuccess(res);
                if (src) {
                    var img = '<img src="' + src + '" style="width:90%;" />';
                    _this.insertImage(img);
                } else {
                    console.log('地址为空啊!大兄弟', src)
                }
            }, function (error) {
                _this._opt.uploadError(error.status,error);
            })

    },
    insertImage: function (src) {
        $(this).focus();
        var selection = window.getSelection ? window.getSelection() : document.selection;
        var range;
        if(this.range) {
            range = this.range;
            this.range = null;
        } else {
            range = selection.createRange ? selection.createRange() : selection.getRangeAt(0);
        }
        if (!window.getSelection) {
            range.pasteHTML(src);
            range.collapse(false);
            range.select();
        } else {
            range.collapse(false);
            var hasR = range.createContextualFragment(src);
            var hasLastChild = hasR.lastChild;
            while (hasLastChild && hasLastChild.nodeName.toLowerCase() == "br" && hasLastChild.previousSibling && hasLastChild.previousSibling.nodeName.toLowerCase() == "br") {
                var e = hasLastChild;
                hasLastChild = hasLastChild.previousSibling;
                hasR.removeChild(e);
            }
            range.insertNode(range.createContextualFragment("<br/>"));
            range.insertNode(hasR);
            if (hasLastChild) {
                range.setEndAfter(hasLastChild);
                range.setStartAfter(hasLastChild);
            }
            selection.removeAllRanges();
            selection.addRange(range);
        }
        if (this._opt.formInputId && $('#' + this._opt.formInputId)[0]) {
            $('#' + this._opt.formInputId).val(this.getValue());
        }
    },
    pasteHandler: function () {
        var _this = this;
        $(this).on("paste", function (e) {
            console.log(e.clipboardData.items);
            var content = $(this).html();
            console.log(content);
            valiHTML = _this._opt.validHtml;
            content = content.replace(/_moz_dirty=""/gi, "").replace(/\[/g, "[[-").replace(/\]/g, "-]]").replace(/<\/ ?tr[^>]*>/gi, "[br]").replace(/<\/ ?td[^>]*>/gi, "&nbsp;&nbsp;").replace(/<(ul|dl|ol)[^>]*>/gi, "[br]").replace(/<(li|dd)[^>]*>/gi, "[br]").replace(/<p [^>]*>/gi, "[br]").replace(new RegExp("<(/?(?:" + valiHTML.join("|") + ")[^>]*)>", "gi"), "[$1]").replace(new RegExp('<span([^>]*class="?at"?[^>]*)>', "gi"), "[span$1]").replace(/<[^>]*>/g, "").replace(/\[\[\-/g, "[").replace(/\-\]\]/g, "]").replace(new RegExp("\\[(/?(?:" + valiHTML.join("|") + "|img|span)[^\\]]*)\\]", "gi"), "<$1>");
            if (!/firefox/.test(navigator.userAgent.toLowerCase())) {
                content = content.replace(/\r?\n/gi, "<br>");
            }
            $(this).html(content);
        });
    },
    placeholderHandler: function () {
        var _this = this;
        $(this).on('focus', function () {
            if ($.trim($(this).html()) === _this._opt.placeholader) {
                $(this).html('');
            }
        })
            .on('blur', function () {
                if (!$(this).html()) {
                    $(this).html(_this._opt.placeholader);
                }
            });

        if (!$.trim($(this).html())) {
            $(this).html(_this._opt.placeholader);
        }
    },
    getValue: function () {
        return $(this).html();
    },
    setValue: function (str) {
        $(this).html(str);
    }
});
