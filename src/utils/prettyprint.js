"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var lastChildIndent = "└───", childIndent = "├───", notChildIndent = "│   ", emptyIndent = "    ";
var attrIndent = "│ ", emptyAttrIndent = "  ";
function prettyPrintArray(node) {
    var ret = [];
    var positionStartStr = "???", positionEndStr = "???";
    if (node.position) {
        if (node.position.start) {
            var start = node.position.start;
            positionStartStr = start.line + ":" + start.column + ":" + start.offset;
        }
        if (node.position.end) {
            var end = node.position.end;
            positionEndStr = end.line + ":" + end.column + ":" + end.offset;
        }
    }
    var positionStr = "(" + positionStartStr + " - " + positionEndStr + ")";
    if (node.type) {
        ret.push("[" + node.type + "] " + positionStr);
    }
    else {
        ret.push("[Unknown] " + positionStr);
    }
    var attributeIndent = node.children ? attrIndent : emptyAttrIndent;
    for (var key in node) {
        if (key !== "type" && key !== "children" && key !== "position") {
            if (node[key] === null) {
                ret.push(attributeIndent + key + ": null");
                continue;
            }
            if (typeof node[key] === "string") {
                var lines = node[key].split("\n");
                if (lines.length === 1)
                    ret.push(attributeIndent + key + ": '" + lines[0] + "'");
                else {
                    // Multiline, each line starts with a pipe('|')
                    ret.push(attributeIndent + key + ": |" + lines[0]);
                    var indent = " ".repeat(key.length + 2) + attributeIndent + "|";
                    for (var i = 1; i < lines.length; i++) {
                        ret.push(indent + lines[i]);
                    }
                }
            }
            else
                ret.push(attributeIndent + key + ": " + JSON.stringify(node[key]));
        }
    }
    if (node.children) {
        // For each child, add indentation
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            var childRet = prettyPrintArray(child);
            for (var j = 0; j < childRet.length; j++) {
                var indent = i === node.children.length - 1
                    ? j === 0
                        ? lastChildIndent
                        : emptyIndent
                    : j === 0
                        ? childIndent
                        : notChildIndent;
                ret.push(indent + childRet[j]);
            }
        }
    }
    return ret;
}
function prettyPrint(node) {
    var ret = prettyPrintArray(node);
    var str = ret.join("\n");
    return str;
}
exports.default = prettyPrint;
