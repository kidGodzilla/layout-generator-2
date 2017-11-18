/**
 * A Modern WYSIWYG Editor
 * Copyright (c) 2013-2017 James Futhey. All Rights Reserved.
 */
window.UPLOADCARE_PUBLIC_KEY = '3ff2e4c7b24492f75d5c';window.AVIARY_API_KEY = '452a72e8202d428ebe21c6c01b8ac37e'; // Test keys (do not distribute)
(function () {
    var $head, $body, $yetiContextMenu, $yetiSecondaryMenu, $bgImage, widget, dialog, dd, drake, enabled, ShadowDOM, currentImage, intv, hasPrepared, DOMConstructed, currentIconBeingEdited, editorModules = [], past = [], future = [], iconFontClassNames = [];

    String.prototype.toUnicode = function () {
        var result = "";
        for (var i = 0; i < this.length; i++) result += "\\u" + ("000" + this[i].charCodeAt(0).toString(16)).substr(-4);
        return result;
    };

    function clearSelection () {
        if (document.selection) document.selection.empty();
        else if (window.getSelection) window.getSelection().removeAllRanges();
    }

    function prepare () {
        $.getScript('https://unpkg.com/diff-dom@latest/diffDOM.js').then(() => {
            if (!window['diffDOM']) return;

            dd = new diffDOM({
                textDiff: function (node, currentValue, expectedValue, newValue) {
                    if (currentValue === expectedValue)
                        node.data = newValue; // The text node contains the text we expect it to contain, so we simple change the text of it to the new value.
                    else
                        node.data = newValue; // The text node currently does not contain what we expected it to contain, so we need to merge.

                    return true;
                },
                valueDiffing: false
            });
        });

        if (window['AVIARY_API_KEY']) $.getScript('cms/aviary-editor.js').then(() => {
            if (!window['Aviary']) return;

            window.csdkImageEditor = new Aviary.Feather({
                apiKey: window.AVIARY_API_KEY,
                onSave: function(imageID, newURL) {
                    saveDOM();

                    if ($bgImage) $bgImage.css('background-image', $bgImage.css('background-image').replace(/url\(.+\)/i, 'url('+newURL+')'));
                    else currentImage.src = newURL;

                    csdkImageEditor.close();
                    domUserModified();
                },
                onError: console.log
            });

            setTimeout(saveDOM, 500);
        });

        $.getScript('https://cdnjs.cloudflare.com/ajax/libs/dragula/3.6.6/dragula.min.js').then(() => {
            if (!window['dragula']) return;

            $('ul, ol, .row').each(function () {
                drake = dragula([$(this)[0]], {
                    revertOnSpill: true
                }).on('drag', function (el) {
                    saveDOM();
                }).on('drop', function (el) {
                    domUserModified();
                });
            });
        });

        hasPrepared = true;
    }

    function saveDOM () {
        if ($yetiContextMenu) $yetiContextMenu.html('').hide();
        if (document.body) ShadowDOM = document.body.cloneNode(true);
    }

    function domUserModified () {
        var diff = dd.diff(ShadowDOM, document.body);

        if (!diff || !diff.length) return;

        past.push({
            ts: + new Date,
            diff: diff
        });

        clearInterval(intv);
        future = [];
        saveDOM();
    }

    function undo () {
        if (!past.length) return;
        var lastItem = past.pop();

        try {
            dd.undo(document.body, lastItem.diff);
        } catch (e) {}

        future.push(lastItem);
        saveDOM();
    }

    function redo () {
        if (!future.length) return;
        var nextItem = future.pop();

        try {
            dd.undo(document.body, nextItem.diff);
        } catch (e) {}

        past.push(nextItem);
        saveDOM();
    }

    function closeModals () {
        $('#yetiChangeIconMenu, #yetiUnderlay').hide();
        saveDOM();
    }

    function loadOnce () {
        $head.append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/dragula/3.7.2/dragula.min.css">');
        $head.append('<link rel="stylesheet" href="https://code.ionicframework.com/ionicons/2.0.1/css/ionicons.min.css">');
        $head.append('<link rel="stylesheet" href="https://cdn.linearicons.com/free/1.0.0/icon-font.min.css">');
        $head.append('<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Lato:400,300,700">');
        $body.append('<div id="yetiUnderlay"></div><div id="yetiChangeIconMenu"><h2><span class="close">x</span>Change Icon</h2></div>');
        $('#yetiUnderlay, #yetiChangeIconMenu .close').on('mousedown', closeModals);
        $body.append('<img id="bgImageContainer" style="display:none">');
        $head.append('<link rel="stylesheet" href="cms/yeti.css">');
        buildChangeIconMenu();

        if (window['UPLOADCARE_PUBLIC_KEY']) $.getScript("https://ucarecdn.com/libs/widget/3.1.2/uploadcare.full.min.js").then(() => {
            $body.append('<input type="hidden" role="uploadcare-uploader" name="content" data-images-only />');
            widget = uploadcare.Widget('[role=uploadcare-uploader]');

            widget.onUploadComplete(function (info) {
                saveDOM();

                if ($bgImage) $bgImage.css('background-image', $bgImage.css('background-image').replace(/url\(.+\)/i, 'url('+info.cdnUrl+')'));
                else currentImage.src = info.cdnUrl;

                domUserModified();
            });
            setTimeout(() => {
                $('.uploadcare--widget__button.uploadcare--widget__button_type_open, .uploadcare--widget.uploadcare--widget_status_ready').css('opacity', '0 !important').css('position', 'absolute !important').css('display', 'none !important').hide();
                saveDOM();
            }, 500);
            saveDOM();
        });

        if (window['AVIARY_API_KEY']) $('img').each(function (i) { // Give all images an ID (for Aviary)
            if (!$(this).attr('id')) $(this).attr('id', 'img-' + i++);
        });

        DOMConstructed = true;
        saveDOM();
    }

    function enable () {
        $(document).ready(() => {
            if (enabled) return;
            enabled = true;
            if (!DOMConstructed) loadOnce();
            $yetiContextMenu = $('.yeti-context-menu.main');
            $yetiSecondaryMenu = $('.yeti-context-menu.secondary');
            $head.append('<style id="yetiOutline">*:hover { box-shadow: inset 0 0 2px rgba(255,100,150,0.95); } #avpw_holder * {box-shadow: none !important;} ul, ol, .row { cursor: move; } </style>');
            $('[contenteditable]').on('focusin', saveDOM).on('focusout', domUserModified);

            $('body :not(script) :not(style) :not(iframe)').contents().filter(function () {
                return this.nodeType === 3 && $(this).text().trim() && !$(this).closest('#avpw_holder').length;
            }).parent().attr('contenteditable', true).off('click').on('click', function (e) { e.preventDefault(); e.stopPropagation(); });

            $body.on('contextmenu', '*', function (e) {
                e.preventDefault();

                editorModules.forEach((module) => {
                    if (typeof module == 'function') module(this);
                });

                var xOffset = e.clientX, yOffset = e.clientY;
                if (xOffset > $(window).width() - 160) xOffset = parseInt($(window).width() - 160); // Too close to the right edge of window
                if (yOffset > $(window).height() - 160) yOffset = parseInt($(window).height() - $yetiContextMenu.height()); // Too close to the bottom edge of window
                $yetiContextMenu.css({top: yOffset + 'px', left: xOffset + 'px'}).show();
            });

            $body.on('mousedown', '*', e => {
                if (e.which !== 1) return;
                $yetiContextMenu.html('').hide();
                $yetiSecondaryMenu.hide();
            });

            // Image hover overlay buttons
            if (window['UPLOADCARE_PUBLIC_KEY'] || window['AVIARY_API_KEY']) $body.append('<div class="yeti cleanslate"><div id="imageEditOverlay"><i class="ion-edit"></i><i class="ion-upload"></i></div></div>');
            if (!window['UPLOADCARE_PUBLIC_KEY']) $('#imageEditOverlay .ion-upload').remove();
            if (!window['AVIARY_API_KEY']) $('#imageEditOverlay .ion-edit').remove();

            if (window['UPLOADCARE_PUBLIC_KEY'] || window['AVIARY_API_KEY'])$('body').on('mouseenter', 'img', function (e) {
                if ($(this).closest('#avpw_holder').length || $(this).width() < 65) return;
                currentImage = $(this)[0];
                $('#imageEditOverlay').show().css('left', $(this).offset().left + ($(this).width()/2) - 40).css('top', $(this).offset().top + ($(this).height()/2) - 14)
            });

            if (window['AVIARY_API_KEY'])$body.on('click', '#imageEditOverlay i.ion-edit', () => {
                saveDOM();

                setTimeout(() => {
                    $('#imageEditOverlay').css('top', '-200px').css('left', '-200px');
                }, 500);

                $bgImage = null;

                csdkImageEditor.launch({
                    image: currentImage.id,
                    url: currentImage.src
                });

                clearSelection();

                setTimeout(() => {
                    $yetiSecondaryMenu.hide();
                    saveDOM();
                }, 300);
            });

            if (window['UPLOADCARE_PUBLIC_KEY'])$body.on('click', '#imageEditOverlay i.ion-upload', () => {
                saveDOM();

                $bgImage = null;
                if (widget && typeof widget.openDialog == 'function') dialog = widget.openDialog();

                setTimeout(() => {
                    saveDOM();
                }, 300);
            });

            // Select text sticky menu
            $body.on('selectstart', '*', function (e) {
                e.stopPropagation();
                var _this = this;
                saveDOM();

                $(document).on('mouseup', function (e) {
                    try {
                        var selection = window.getSelection(), range = selection.getRangeAt(0), rect = range.getBoundingClientRect();
                    } catch(e){}

                    if (!rect || !selection || !selection.toString().length || $yetiContextMenu.html().length) return;
                    $yetiSecondaryMenu.html('');

                    // Strikethrough Editor module
                    $yetiSecondaryMenu.prepend(() => {
                        return $('<a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-strikethrough"></span></a>').on('mousedown', { that: _this }, (event) => {
                            saveDOM();
                            document.execCommand('strikeThrough', false, null);
                            domUserModified();
                        });
                    });

                    // Underline Editor module
                    $yetiSecondaryMenu.prepend(() => {
                        return $('<a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-underline"></span></a>').on('mousedown', { that: _this }, (event) => {
                            saveDOM();
                            document.execCommand('underline', false, null);
                            domUserModified();
                        });
                    });

                    // Italics Editor module
                    $yetiSecondaryMenu.prepend(() => {
                        return $('<a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-italic"></span></a>').on('mousedown', { that: _this }, (event) => {
                            saveDOM();
                            document.execCommand('italic', false, null);
                            domUserModified();
                        });
                    });

                    // Bold Editor module
                    $yetiSecondaryMenu.prepend(() => {
                        return $('<a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-bold"></span></a>').on('mousedown', { that: _this }, (event) => {
                            saveDOM();
                            document.execCommand('bold', false, null);
                            domUserModified();
                        });
                    });

                    $yetiSecondaryMenu.show().css('left', rect.left + (rect.width/2) - ($yetiSecondaryMenu.width()/2)).css('top', rect.top - 36).show();
                    saveDOM();
                });
            });


            // Click on an icon
            $body.on('mousedown', '*', function (e) {
                if (e.which !== 1) return;
                var isIcon;
                if ($(this).attr('class')) $(this).attr('class').split(/\s+/).forEach((cn) => {
                    if (iconFontClassNames.indexOf(cn) !== -1) isIcon = true;
                });
                if (!isIcon) return;
                currentIconBeingEdited = this;
                $('#yetiChangeIconMenu i').removeClass('selected');
                $('#yetiChangeIconMenu, #yetiUnderlay').fadeIn('fast');
                var cc = $(this).attr('class').slice(2).trim();
                $('#yetiChangeIconMenu i.' + cc).addClass('selected');
                saveDOM();
            });
        });
    }

    function disable () {
        $('[contenteditable]').off('click').off('focusin').off('focusout').attr('contenteditable', false);
        $body.off('contextmenu').off('selectstart').off('mousedown').off('mouseenter').off('click');
        $('#imageEditOverlay').hide().css('top', '-200px').css('left', '-200px');
        $('#yetiOutline').remove();
        $(document).off('mouseup');
        $yetiSecondaryMenu.hide();
        $yetiContextMenu.hide();
        drake.destroy();
        enabled = 0;
    }

    (function (console) {
        console.save = function (data, filename) {
            if (!data) return;
            if (typeof data === "object") data = JSON.stringify(data, undefined, 4);
            if (!filename) filename = 'console.json';
            var b = new Blob([data], {type: 'text/json'}), e = document.createEvent('MouseEvents'), a = document.createElement('a');
            a.download = filename;
            a.href = window.URL.createObjectURL(b);
            a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':');
            e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            a.dispatchEvent(e);
        }
    })(console);

    function findIconsOnPage () {
        for (var el of document.styleSheets) {
            if (el && el.rules) {
                for (let elm of el.rules) {
                    let content = '';
                    if (elm && elm.style && elm.style.content) content = elm.style.content;
                    if (content && content[0] === '"') try { content = JSON.parse(content) } catch(e){}
                    let k = parseInt(content.toUnicode().split('\\u').join(''), 16);

                    if (k > 10000 && content.length == 1 && elm.selectorText.indexOf(':before') !== -1) {
                        let matches = elm.selectorText.match(/\.[\w\-]*/g);
                        if (matches && matches.length === 1 && matches[0].slice(1).indexOf('small') == -1 && iconFontClassNames.indexOf(matches[0].slice(1)) == -1)
                            iconFontClassNames.push(matches[0].slice(1));
                    }
                }
            }
        }

        return iconFontClassNames;
    }

    function buildChangeIconMenu () {
        var iconClasses = findIconsOnPage();
        for (var i = 0; i < iconClasses.length; i++) {
            $('#yetiChangeIconMenu').append(() => {
                var iconClass = iconClasses[i], prefix = "";
                if (!iconClass || iconClass.trim() === '') return;
                if (iconClass.indexOf('fa-') === 0) prefix = "fa ";
                if (iconClass.indexOf('icon-') === 0) prefix = "icon ";
                if (iconClass.indexOf('glyphicon-') === 0) prefix = "glyphicon ";

                return $(`<i class="${ prefix + iconClasses[i] }"></i>`).off('mousedown').on('mousedown', function () {
                    var c = $(this).attr('class');
                    $('#yetiChangeIconMenu i').removeClass('selected');
                    $(this).addClass('selected');
                    saveDOM();
                    changeIcon(c);
                    setTimeout(closeModals, 50)
                });
            });
            saveDOM();
        }
    }

    function changeIcon (newClass) {
        if (!currentIconBeingEdited) return;
        
        var newClasses = $(currentIconBeingEdited).attr('class').split(/\s+/).filter((className) => {
            return iconFontClassNames.indexOf(className) === -1;
        }).join(' ') + ' ' + newClass;

        $(currentIconBeingEdited).attr('class', newClasses);
        domUserModified();
    }

    editorModules.push(function () {
        $yetiSecondaryMenu.html('').css('top', '-100px').css('left', '-100px');
    });

    // Create link Editor module
    editorModules.push(function (_this) {
        if (!$(_this).is('[contenteditable]') || $(_this).is('a')) return;

        $yetiContextMenu.prepend(() => {
            if ($('.yeti-context-menu-button.create-link, .yeti-context-menu-button.remove-link').length) return;

            return $('<a class="yeti-context-menu-button create-link"><i class="ion-link" style="padding-right:7px !important"></i>Create Link</a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();
                var link = prompt('Please specify the link URL', 'https://');
                if (link) document.execCommand('createLink', false, link);
                domUserModified();
            });
        });
    });

    // Remove link Editor module
    editorModules.push(function (_this) {
        if (!$(_this).is('a')) return;

        $yetiContextMenu.prepend(() => {
            if ($('.yeti-context-menu-button.remove-link').length) return;

            return $('<a class="yeti-context-menu-button remove-link"><i class="ion-link" style="padding-right:7px !important"></i>Remove Link</a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();
                $(event.data.that).after($('<span>'+$(event.data.that).html()+'</span>').attr('contenteditable', true)).remove();
                domUserModified();
            });
        });
    });

    // Edit link Editor module
    editorModules.push(function (_this) {
        if (!$(_this).is('a')) return;

        $yetiContextMenu.prepend(() => {
            if ($('.yeti-context-menu-button.create-link, .yeti-context-menu-button.edit-link').length) return;

            return $('<a class="yeti-context-menu-button edit-link"><i class="ion-link" style="padding-right:7px !important"></i>Edit Link</a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();
                var previousLink = $(event.data.that).attr('href');
                var link = prompt('Please specify the link URL', previousLink);
                if (link && link !== previousLink) $(event.data.that).attr('href', link);
                domUserModified();
            });
        });
    });

    // Strikethrough Editor module
    editorModules.push(function (_this) {
        if (!$(_this).is('[contenteditable]')) return;

        $yetiContextMenu.prepend(() => {
            if ($('.yeti-context-menu-button .lnr-strikethrough').length) return;

            return $('<a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-strikethrough"></span></a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();
                document.execCommand('strikeThrough', false, null);
                domUserModified();
            });
        });
    });

    // Underline Editor module
    editorModules.push(function (_this) {
        if (!$(_this).is('[contenteditable]')) return;

        $yetiContextMenu.prepend(() => {
            if ($('.yeti-context-menu-button .lnr-underline').length) return;

            return $('<a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-underline"></span></a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();
                document.execCommand('underline', false, null);
                domUserModified();
            });
        });
    });

    // Italics Editor module
    editorModules.push(function (_this) {
        if (!$(_this).is('[contenteditable]')) return;

        $yetiContextMenu.prepend(() => {
            if ($('.yeti-context-menu-button .lnr-italic').length) return;

            return $('<a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-italic"></span></a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();
                document.execCommand('italic', false, null);
                domUserModified();
            });
        });
    });

    // Bold Editor module
    editorModules.push(function (_this) {
        if (!$(_this).is('[contenteditable]')) return;

        $yetiContextMenu.prepend(() => {
            if ($('.yeti-context-menu-button .lnr-bold').length) return;

            return $('<a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-bold"></span></a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();
                document.execCommand('bold', false, null);
                domUserModified();
            });
        });
    });

    // Icon Editor module
    editorModules.push(function (_this) {
        var isIcon;
        if (_this && $(_this) && $(_this).attr('class')) $(_this).attr('class').split(/\s+/).forEach((cn) => {
            if (iconFontClassNames.indexOf(cn) !== -1) isIcon = true;
        });

        if (!isIcon) return;

        if ($('.icon-editor').length) return;

        $yetiContextMenu.prepend(() => {
            if ($('.yeti-context-menu-button .icon-editor').length) return;

            return $('<a class="yeti-context-menu-button icon-editor"><i class="ion-android-checkbox-outline-blank" style="padding-right:7px !important"></i>Choose Icon</a>').on('mousedown', { that: _this }, (event) => {
                currentIconBeingEdited = event.data.that;
                $('#yetiChangeIconMenu i').removeClass('selected');
                $('#yetiChangeIconMenu, #yetiUnderlay').fadeIn('fast');
                var cc = $(event.data.that).attr('class').slice(2).trim();
                $('#yetiChangeIconMenu i.' + cc).addClass('selected');
                saveDOM();
            });
        });
    });

    // Image Editor module
    if (window['AVIARY_API_KEY']) editorModules.push(function (_this) {
        $yetiContextMenu.append(() => {
            if ($('.yeti-context-menu-button.edit-image').length) return;

            var src = $(_this).attr('src');

            if (!src || _this.tagName !== 'IMG')
                src = $(_this).find('img').attr('src');

            if (!src) return;

            return $('<a class="yeti-context-menu-button edit-image"><i class="ion-images"></i>Edit Image<img src="' + src + '"></a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();

                if ($(event.data.that)[0].tagName == 'IMG')
                    currentImage = $(event.data.that)[0];
                else
                    currentImage = $(event.data.that).find('img')[0];

                $bgImage = null;

                csdkImageEditor.launch({
                    image: currentImage.id,
                    url: currentImage.src
                });

                clearSelection();

                setTimeout(() => {
                    $yetiSecondaryMenu.hide();
                    saveDOM();
                }, 300);
            });
        });
    });

    // Replace Image Editor module
    if (window['UPLOADCARE_PUBLIC_KEY']) editorModules.push(function (_this) {
        $yetiContextMenu.append(() => {
            if ($('.yeti-context-menu-button.replace-image').length) return;

            var src = $(_this).attr('src');

            if (!src || _this.tagName !== 'IMG')
                src = $(_this).find('img').attr('src');

            if (!src) return;

            return $('<a class="yeti-context-menu-button replace-image"><i class="ion-images"></i>Replace<img src="' + src + '"></a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();

                if ($(event.data.that)[0].tagName == 'IMG')
                    currentImage = $(event.data.that)[0];
                else
                    currentImage = $(event.data.that).find('img')[0];

                $bgImage = null;

                if (widget && typeof widget.openDialog == 'function') dialog = widget.openDialog();

                setTimeout(() => {
                    saveDOM();
                }, 300);
            });
        });
    });

    // Background image Editor module
    if (window['AVIARY_API_KEY']) editorModules.push(function (_this) {
        $yetiContextMenu.append(() => {
            if (!$(_this).css('background-image') || $(_this).css('background-image') == '') return;
            if ($('.yeti-context-menu-button.edit-background-image').length) return;

            var tmp = $(_this).css('background-image');
            tmp = /^url\((['"]?)(.*)\1\)$/.exec(tmp);
            var src = tmp ? tmp[2] : "";
            if (!src) return;

            return $('<a class="yeti-context-menu-button edit-background-image"><i class="ion-images"></i>Edit Image<img src="' + src + '"></a>').on('mousedown', { that: _this, imageSrc: src }, (event) => {
                $('#bgImageContainer').attr('src', event.data.imageSrc);
                currentImage = $('#bgImageContainer')[0];
                $bgImage = $(event.data.that);

                csdkImageEditor.launch({
                    image: currentImage.id,
                    url: currentImage.src
                });

                clearSelection();

                setTimeout(() => {
                    $yetiSecondaryMenu.hide();
                    saveDOM();
                }, 300);
                saveDOM();
            });
        });
    });

    // Replace Background image Editor module
    if (window['UPLOADCARE_PUBLIC_KEY']) editorModules.push(function (_this) {
        $yetiContextMenu.append(() => {
            if (!$(_this).css('background-image') || $(_this).css('background-image') == '') return;
            if ($('.yeti-context-menu-button.replace-background-image').length) return;

            var tmp = $(_this).css('background-image');
            tmp = /^url\((['"]?)(.*)\1\)$/.exec(tmp);
            var src = tmp ? tmp[2] : "";
            if (!src) return;

            return $('<a class="yeti-context-menu-button replace-background-image"><i class="ion-images"></i>Replace<img src="' + src + '"></a>').on('mousedown', { that: _this, imageSrc: src }, (event) => {
                $('#bgImageContainer').attr('src', event.data.imageSrc);
                currentImage = $('#bgImageContainer')[0];
                $bgImage = $(event.data.that);

                if (widget && typeof widget.openDialog == 'function') dialog = widget.openDialog();

                setTimeout(saveDOM, 300);
                saveDOM();
            });
        });
    });

    // Clone element Editor module
    editorModules.push(function (_this) {
        $yetiContextMenu.append(() => {
            if ($('.yeti-context-menu-button.clone-element').length) return;

            return $('<a class="yeti-context-menu-button clone-element"><i class="ion-ios-copy-outline" style="padding-right:7px !important"></i>Clone Element</a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();
                $(event.data.that).parent().append($(event.data.that).clone());
                domUserModified();
            });
        });
    });

    // Remove an element Editor module
    editorModules.push(function (_this) {
        $yetiContextMenu.append(() => {
            if ($('.yeti-context-menu-button.remove-button').length) return;

            return $('<a class="yeti-context-menu-button remove-button"><i class="ion-backspace" style="padding-right:7px !important"></i>Remove</a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();
                $(event.data.that).remove();
                domUserModified();
            });
        });
    });

    // Stop Editing Editor module
    editorModules.push(function (_this) {
        $yetiContextMenu.append(() => {
            if ($('.yeti-context-menu-button.stop-editing').length)
                $('.yeti-context-menu-button.stop-editing').remove();

            return $('<a class="yeti-context-menu-button stop-editing"><i class="ion-stop" style="padding-right:7px !important"></i>Stop Editing</a>').on('mousedown', { that: _this }, (event) => {
                saveDOM();
                disable();
            });
        });
    });

    $(document).ready(() => {
        $head = $('head'); $body = $('body');
        $body.append('<div class="yeti cleanslate"><div class="yeti-context-menu main"></div></div><div class="yeti cleanslate"><div class="yeti-context-menu secondary"><a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-bold"></span></a><a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-italic"></span></a><a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-underline"></span></a><a class="yeti-context-menu-button yeti-quarter-button"><span class="lnr lnr-strikethrough"></span></a></div></div>');
        //$body.append('<a class="yeti-btn-circle-with-gradient" style="box-shadow: none !important;"><span style="box-shadow: none !important;">✎</span></a>');
        //$head.append('<style>.yeti-btn-circle-with-gradient span { font-size:24px;display: block;transform:scaleX(-1);position:relative;top:-5px;left:1px;color:#fff; } .yeti-btn-circle-with-gradient {opacity:0.9; cursor: pointer; background-image: linear-gradient(45deg, #663fb5, #2b8be3); background-repeat: repeat-x; display: block; width: 2.5rem; height: 2.5rem; padding: 0; font-size: 1.25rem; line-height: 2.2; color: #fff; text-align: center; border-radius: 50%; opacity: .8; z-index: 99999999; position: relative; left: 20px; bottom: 60px;} .yeti-btn-circle-with-gradient:hover {box-shadow: none !important;opacity: 1 !important; }</style>');
        //$('.yeti-btn-circle-with-gradient').on('click', () => {
        //    enabled ? disable() : enable();
        //});
        if (!hasPrepared) prepare();

        if ($ && $.event && $.event.special && typeof $.event.special == 'object') $.event.special.tripleclick = {
            setup: function (data, namespaces) {
                jQuery(this).bind('click', jQuery.event.special.tripleclick.handler);
            },
            teardown: function (namespaces) {
                jQuery(this).unbind('click', jQuery.event.special.tripleclick.handler)
            },
            handler: function (event) {
                var clicks = jQuery(this).data('clicks') || 0;
                clicks += 1;
                if (clicks === 3) {
                    clicks = 0;
                    event.type = "tripleclick";
                    if (jQuery.event.handle === undefined) jQuery.event.dispatch.apply(this, arguments);
                    else jQuery.event.handle.apply(this, arguments); // for jQuery before 1.9

                }
                setTimeout(() => {
                    jQuery(this).data('clicks', 0);
                }, 700);
                jQuery(this).data('clicks', clicks);
            }
        };

        $(document).on('tripleclick', () => {
            if (!enabled) enable();
        });

        $(document).on('keydown', e => {
            if (enabled && e.keyCode == 90 && (e.metaKey || e.ctrlKey)) { // CMD+Z to undo, CMD+SHIFT+Z to redo
                e.preventDefault();
                e.shiftKey ? redo() : undo();
            }

            if (e.keyCode !== 69 || !e.shiftKey || (!e.metaKey && !e.ctrlKey)) return; // CMD+SHIFT+E to toggle editor
            enabled ? disable() : enable();
        });

        intv = setInterval(() => {
            if (!dd || !window['incomingEditorChanges'] || !incomingEditorChanges.length) return;

            while (incomingEditorChanges && incomingEditorChanges.length) {
                var change = incomingEditorChanges.shift();
                try {
                    dd.apply(document.body, change.diff);
                } catch (e) {}
                past.push(change);
            }

            $body.addClass('ggLoaded');
            clearInterval(intv);
            saveDOM();
        }, 500);

        setTimeout(() => {
            $body.addClass('ggLoaded');
        }, 1800);

        saveDOM();
    });

    window.WYSIWYG = {
        domUserModified: domUserModified,
        editorModules: editorModules,
        future() { return future },
        past() { return past },
        saveDOM: saveDOM,
        disable: disable,
        enable: enable,
        undo: undo,
        redo: redo
    }
})();
