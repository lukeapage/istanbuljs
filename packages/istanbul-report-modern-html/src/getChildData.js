function addPath(node, parentPath) {
    if (!parentPath) {
        return node;
    }
    return { ...node, file: parentPath + '/' + node.file };
}

function flatten(nodes, parentPath) {
    let children = [];
    for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i];
        if (child.children) {
            children = [
                ...children,
                ...flatten(
                    child.children,
                    (!parentPath ? '' : '/' + parentPath) + child.file
                )
            ];
        } else {
            children.push(addPath(child, parentPath));
        }
    }
    return children;
}

function filterByFile(nodes, fileFilter, parentPath) {
    let children = [];

    for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i];
        const childFullPath = (parentPath ? parentPath + '/' : '') + child.file;
        if (
            childFullPath === fileFilter ||
            childFullPath.indexOf(fileFilter) < 0
        ) {
            if (fileFilter.indexOf(childFullPath) === 0) {
                // flatten
                children = [
                    ...children,
                    ...filterByFile(child.children, fileFilter, childFullPath)
                ];
            }
        } else {
            const charsToRemoveFromFile =
                fileFilter.length - (parentPath ? parentPath.length : 0);
            let childFilename = child.file.slice(charsToRemoveFromFile);
            if (childFilename[0] === '/') {
                childFilename = childFilename.slice(1);
            }
            children.push({
                ...child,
                file: childFilename
            });
        }
    }
    return children;
}

function sort(childData, activeSort) {
    const top = activeSort.order === 'asc' ? 1 : -1;
    const bottom = activeSort.order === 'asc' ? -1 : 1;
    childData.sort((a, b) => {
        let valueA;
        let valueB;
        if (activeSort.sortKey === 'file') {
            valueA = a.file;
            valueB = b.file;
        } else {
            const [metricType, valueType] = activeSort.sortKey.split('.');
            valueA = a.metrics[metricType][valueType];
            valueB = b.metrics[metricType][valueType];
        }

        if (valueA === valueB) {
            return 0;
        }
        return valueA < valueB ? top : bottom;
    });

    for (let i = 0; i < childData.length; i++) {
        const child = childData[i];
        if (child.children) {
            childData[i] = {
                ...child,
                children: sort(child.children, activeSort)
            };
        }
    }
    return childData;
}

function filter(nodes, metricsMap, activeFilters) {
    const children = [];
    for (let i = 0; i < nodes.length; i++) {
        let child = nodes[i];
        if (child.children) {
            const newSubChildren = filter(
                child.children,
                metricsMap,
                activeFilters
            );
            if (newSubChildren.length) {
                child = { ...child, children: newSubChildren };
                children.push(child);
            }
        } else {
            if (
                (metricsMap.statements &&
                    activeFilters[child.metrics.statements.classForPercent]) ||
                (metricsMap.branches &&
                    activeFilters[child.metrics.branches.classForPercent]) ||
                (metricsMap.functions &&
                    activeFilters[child.metrics.functions.classForPercent]) ||
                (metricsMap.lines &&
                    activeFilters[child.metrics.lines.classForPercent])
            ) {
                children.push(child);
            }
        }
    }
    return children;
}

export default function getChildData(
    sourceData,
    metricsToShow,
    activeSort,
    summarizerType,
    activeFilters,
    fileFilter
) {
    let childData;

    if (summarizerType === 'flat') {
        childData = flatten(sourceData['package'].children.slice(0));
    } else {
        childData = sourceData[summarizerType].children;
    }

    if (fileFilter) {
        childData = filterByFile(childData, fileFilter);
    }

    childData = filter(childData, metricsToShow, activeFilters);

    if (activeSort) {
        childData = sort(childData, activeSort);
    }
    return childData;
}