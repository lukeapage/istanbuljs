/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
const fs = require('fs');
const path = require('path');
const HtmlReport = require('istanbul-reports/lib/html');

const standardLinkMapper = {
    getPath(node) {
        if (typeof node === 'string') {
            return node;
        }
        let filePath = node.getQualifiedName();
        if (node.isSummary()) {
            if (filePath !== '') {
                filePath += '/index.html';
            } else {
                filePath = 'index.html';
            }
        } else {
            filePath += '.html';
        }
        return filePath;
    },

    relativePath(source, target) {
        const targetPath = this.getPath(target);
        const sourcePath = path.dirname(this.getPath(source));
        return path.relative(sourcePath, targetPath);
    },

    assetPath(node, name) {
        return this.relativePath(this.getPath(node), name);
    }
};

function ModernHtmlReport(opts) {
    this.verbose = opts.verbose;
    this.linkMapper = opts.linkMapper || standardLinkMapper;
    this.subdir = opts.subdir || '';
    this.date = Date();
    this.skipEmpty = opts.skipEmpty;
    this.htmlReport = new HtmlReport(opts);
}

ModernHtmlReport.prototype.getWriter = function(context) {
    if (!this.subdir) {
        return context.writer;
    }
    return context.writer.writerForDir(this.subdir);
};

ModernHtmlReport.prototype.onStart = function(root, context) {
    this.htmlReport.onStart(root, context);

    const assetHeaders = {
        '.js': '/* eslint-disable */\n'
    };

    const writer = this.getWriter(context);
    const srcDir = path.resolve(__dirname, '../assets');
    fs.readdirSync(srcDir).forEach(f => {
        const resolvedSource = path.resolve(srcDir, f);
        const resolvedDestination = '.';
        const stat = fs.statSync(resolvedSource);
        let dest;

        if (stat.isFile()) {
            dest = resolvedDestination + '/' + f;
            if (this.verbose) {
                console.log('Write asset: ' + dest);
            }
            writer.copyFile(
                resolvedSource,
                dest,
                assetHeaders[path.extname(f)]
            );
        }
    });
};

ModernHtmlReport.prototype.requiresSummarizer = function() {
    return 'nested';
};

ModernHtmlReport.prototype.onDetail = function(node, context) {
    this.htmlReport.onDetail(node, context);
};

ModernHtmlReport.prototype.toDataStructure = function(node, parent, context) {
    const metrics = node.getCoverageSummary();

    metrics.statements.classForPercent = context.classForPercent(
        'statements',
        metrics.statements.pct
    );
    metrics.branches.classForPercent = context.classForPercent(
        'branches',
        metrics.branches.pct
    );
    metrics.functions.classForPercent = context.classForPercent(
        'functions',
        metrics.functions.pct
    );
    metrics.lines.classForPercent = context.classForPercent(
        'lines',
        metrics.lines.pct
    );

    return {
        file: node.getRelativeName(),
        output: parent && this.linkMapper.relativePath(parent, node),
        isEmpty: metrics.isEmpty(),
        metrics,
        children:
            node.isSummary() &&
            node
                .getChildren()
                .map(child => this.toDataStructure(child, node, context))
    };
};

ModernHtmlReport.prototype.onEnd = function(rootNode, context) {
    const data = this.toDataStructure(rootNode, null, context);

    const cw = this.getWriter(context).writeFile(
        this.linkMapper.getPath(rootNode)
    );
    cw.write(
        `<html lang="en">
            <head>
                <link rel="stylesheet" href="modern.css" />
                <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body>
                <div id="app"></div>
                <script>
                    window.data=${JSON.stringify(data)};
                    window.generatedDatetime = ${JSON.stringify(
                        String(Date())
                    )};
                </script>
                <script src="bundle.js"></script>
            </body>
        </html>`
    );
    cw.close();
};

module.exports = ModernHtmlReport;
