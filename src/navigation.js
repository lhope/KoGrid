/// <reference path="namespace.js" />
/// <reference path="utils.js" />
/// <reference path="../lib/jquery-1.7.js" />
/// <reference path="../lib/knockout-2.0.0.debug.js" />
/// <reference path="../lib/knockout-latest.debug.js" />
/// <reference path="constants.js" />

//set event binding on the grid so we can select using the up/down keys
kg.moveSelectionHandler = function (grid, evt) {
    // null checks 
    if (!grid)
        return true;

    if (!grid.config.selectedItems())
        return true;
        
    var offset,
        charCode = (evt.which) ? evt.which : event.keyCode;

    // detect which direction for arrow keys to navigate the grid
    switch (charCode) {
        case 38:
            // up - select previous
            offset = -1;
            break;
        case 40:
            // down - select next
            offset = 1;
            break;
        default:
            return true;
    }

    var items = grid.finalData(),
        n = items.length,
        index = ko.utils.arrayIndexOf(items, grid.config.lastClickedRow().entity()) + offset,
        rowCache = grid.rowManager.rowCache,
        row,
        selected,
        itemToView;

    // now find the item we arrowed to, and select it
    if (index >= 0 && index < n) {

        selected = items[index];
        row = rowCache[selected[ROW_KEY]];

        // fire the selection
        row.toggleSelected(null, evt);

        itemToView = kg.utils.getElementsByClassName("kgSelected");

        // finally scroll it into view as we arrow through
        if (!Element.prototype.scrollIntoViewIfNeeded) {
            itemToView[0].scrollIntoView(false);
            grid.$viewport.focus();
           
        } else {
            itemToView[0].scrollIntoViewIfNeeded();
        }
    }
    return false;
}; 