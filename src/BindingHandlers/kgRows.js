/// <reference path="../GridClasses/RowSubscription.js" />
/// <reference path="../namespace.js" />
/// <reference path="../../lib/knockout-latest.debug.js" />
/// <reference path="../../lib/knockout-2.0.0.debug.js" />
/// <reference path="../../lib/jquery-1.7.js" />

ko.bindingHandlers['kgRows'] = (function () {
    // figures out what rows already exist in DOM and 
    // what rows need to be added as new DOM nodes
    //
    // the 'currentNodeCache' is dictionary of currently existing
    // DOM nodes indexed by rowIndex
    var compareRows = function (rows, rowSubs) {
        var rowMap = {},
            newRows = [],
            rowSubsToRemove = [];
        //figure out what rows need to be added
        ko.utils.arrayForEach(rows, function (row) {
            rowMap[row.rowIndex] = row;
            // make sure that we create new rows when sorting/filtering happen.
            // The rowKey tells us whether the row for that rowIndex is different or not
            var possibleRow = rowSubs[row.rowIndex];
            if (!possibleRow) {
                newRows.push(row);
            } else if (possibleRow.rowKey !== row.rowKey) {
                newRows.push(row);
            }
        });
        //figure out what needs to be deleted
        kg.utils.forIn(rowSubs, function (sub, index) {
            //get the row we might be able to compare to
            var compareRow = rowMap[index];
            // if there is no compare row, we want to remove the row from the DOM
            // if there is a compare row and the rowKeys are different, we want to remove from the DOM
            //  bc its most likely due to sorting etc..
            if (!compareRow) {
                rowSubsToRemove.push(sub);
            } else if (compareRow.rowKey !== sub.rowKey) {
                rowSubsToRemove.push(sub);
            }
        });
        return {
            add: newRows,
            remove: rowSubsToRemove
        };
    };
    return {
        init: function () {
            return { 'controlsDescendantBindings': true };
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var rowManager = bindingContext.$data.rowManager,
                rows = ko.utils.unwrapObservable(valueAccessor()),
                grid = bindingContext.$data,
                rowChanges;
            //figure out what needs to change
            rowChanges = compareRows(rows, rowManager.rowSubscriptions || {});
            // FIRST!! We need to remove old ones in case we are sorting and simply replacing the data at the same rowIndex            
            ko.utils.arrayForEach(rowChanges.remove, function (sub) {
                if (sub.node) {
                    ko.removeNode(sub.node);
                }
                sub.subscription.dispose();
                delete rowManager.rowSubscriptions[sub.rowIndex];
            });

            // and then we add the new row after removing the old rows
            ko.utils.arrayForEach(rowChanges.add, function (row) {
                var newBindingCtx,
                    divNode = document.createElement('DIV');
                //make sure the bindingContext of the template is the row and not the grid!
                newBindingCtx = bindingContext.createChildContext(row);
                //create a node in the DOM to replace, because KO doesn't give us a good hook to just do this...
                element.appendChild(divNode);
                //create a row subscription to add data to
                var rowSub = new kg.RowSubscription();
                rowSub.rowKey = row.rowKey;
                rowSub.rowIndex = row.rowIndex;
                rowManager.rowSubscriptions[row.rowIndex] = rowSub;
                rowSub.subscription = ko.renderTemplate(kg.templateManager.getTemplate(grid.config.rowTemplate), newBindingCtx, null, divNode, 'replaceNode');
            });
            //only measure the row and cell differences when data changes
            if (grid.elementsNeedMeasuring && grid.initPhase > 0) {
                //Measure the cell and row differences after rendering
                kg.domUtility.measureRow($(element), grid);
            }
            return { 'controlsDescendantBindings': true };
        }
    };
} ());