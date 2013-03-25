/*global define $ _*/
define(function(require, exports, module) {
    "use strict";
    var editor = require("../editor");
    var project = require("../project");
    var keyCode = require("./key_code");

    var visible = false;

    /**
     * Supported options
     * - placeholder
     * - text (initial text in input)
     * - filter (function)
     * - hint (function)
     * - onSelect (function)
     * - onCancel (function)
     */
    exports.filterBox = function(options) {
        var placeholder = options.placeholder || "";
        var filter = options.filter;
        var onSelect = options.onSelect;
        var onChange = options.onChange;
        var onCancel = options.onCancel;
        var hint = options.hint;
        
        if (visible) {
            return;
        }
        
        var edit = editor.getActiveEditor();
        $("body").append("<div id='goto'><input type='text' id='gotoinput' placeholder='" + placeholder + "'/><div id='gotohint'></div><ul id='results'>");

        var editorEl = $(edit.container);
        var gotoEl = $("#goto");
        var hintEl = $("#gotohint");
        var box = $("#goto");
        var input = $("#gotoinput");
        var resultsEl = $("#results");
        
        if(options.text) {
            input.val(options.text);
        }

        gotoEl.css("left", (editorEl.offset().left + 40) + "px");
        gotoEl.css("width", (editorEl.width() - 80) + "px");
        gotoEl.css("top", editorEl.offset().top + "px");

        visible = true;

        var lastPhrase = null;
        var results = [];

        var ignoreFocus = false;
        
        resultsEl.menu({
            select: select,
            focus: function(event, ui) {
                if (ignoreFocus) {
                    ignoreFocus = false;
                    return;
                }
                input.val(ui.item.data("path"));
                triggerOnChange();
                updateHint();
            }
        });
        
        input.keyup(function(event) {
            switch (event.keyCode) {
                case keyCode('Esc'):
                    onCancel && onCancel();
                    close();
                    break;
                case keyCode('Up'):
                    resultsEl.menu("previous");
                    break;
                case keyCode('Down'):
                    resultsEl.menu("next");
                    break;
                case keyCode('Return'):
                    select();
                    break;
                case keyCode('Tab'):
                    break;
                default:
                    if (lastPhrase != input.val()) {
                        updateResults();
                        triggerOnChange();
                    }
            }
        });
        input.keydown(function(event) {
            switch (event.keyCode) {
                case keyCode('Space'):
                    var phrase = input.val();
                    if (phrase) break;
                    var session = editor.getActiveSession();
                    if (session.filename) {
                        input.val(project.dirname(session.filename) + "/");
                        event.preventDefault();
                    }
                    break;
                case keyCode('Backspace'):
                    // backspace
                    var val = input.val();
                    var caret = input.caret();
                    if (val === '/') {
                        input.val('');
                    } else if (val[caret.start - 1] === '/') {
                        input.val(project.dirname(input.val()) + "/");
                        event.preventDefault();
                    }
                    break;
                case keyCode('Tab'):
                    // Tab
                    if (event.shiftKey) {
                        resultsEl.menu("previous");
                    } else {
                        resultsEl.menu("next");
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    break;
            }
        });
        input.focus();
        updateResults();
        triggerOnChange();
        
        function triggerOnChange() {
            onChange && onChange(input.val(), getCurrentHighlightedItem());
        }
        
        function getCurrentHighlightedItem() {
            return resultsEl.find("a.ui-state-focus").parent().data("path");
        }

        function select(event) {
            var inputVal = input.val();
            var selection = inputVal;
            var selectedPath = getCurrentHighlightedItem();
            close();
            if (selection) {
                if (selection[0] !== '/' && selection.indexOf("zed:") !== 0 && selectedPath)
                    selection = selectedPath;
                onSelect(selection, inputVal);
            } else {
                // By default pick the item at the top of the list
                if (selectedPath)
                    onSelect(selectedPath, inputVal);
            }
            event && event.preventDefault();
        }

        function close() {
            resultsEl.menu("destroy");
            box.remove();
            editor.getActiveEditor().focus();
            visible = false;
        }
        
        function updateHint() {
            if(hint) {
                hintEl.html(hint(input.val(), results));
            }
        }

        function updateResults() {
            var phrase = input.val();
            results = filter(phrase).slice(0, 100);
            var html = '';
            results.forEach(function(r) {
                var meta = r.meta ? '<span class="meta">' + r.meta + '</meta>' : '';
                html += '<li data-path="' + _.escape(r.path) + '"><a href="#">' + r.name + '</a>' + meta + '</li>';
            });
            resultsEl.html(html);
            resultsEl.menu("refresh");
            if (phrase[0] !== '/') {
                ignoreFocus = true;
                if (results.length > 0) {
                    resultsEl.menu("next");
                }
            }
            updateHint();
            lastPhrase = phrase;
        }
    };
});