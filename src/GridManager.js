/// <reference path="constants.js" />
/// <reference path="namespace.js" />

kg.gridManager = (new function () {
    var self = this;
    // the place we store grids
    this.gridCache = {};
   
    
    this.storeGrid = function (element, grid) {
        self.gridCache[grid.gridId] = grid;
        element[GRID_KEY] = grid.gridId;
    };
    
    this.removeGrid = function(gridId) {
        delete self.gridCache[gridId];
    };

    this.getGrid = function (element) {
        var grid = undefined;
        if (element[GRID_KEY]) {
            grid = self.gridCache[element[GRID_KEY]];
        }
        return grid;
    };

    this.clearGridCache = function () {
        self.gridCache = {};
    };
    
    this.getIndexOfCache = function(gridId) {
        kg.utils.indexOfProp(self.gridCache, gridId);
    };

    this.assignGridEventHandlers = function (grid) {

        grid.$viewport.scroll(function (e) {
            var scrollLeft = e.target.scrollLeft,
                scrollTop = e.target.scrollTop;

            grid.adjustScrollLeft(scrollLeft);
            grid.adjustScrollTop(scrollTop);
        });

        grid.$viewport.off('keydown');
        grid.$viewport.on('keydown', function (e) {
            return kg.moveSelectionHandler(grid, e);
        });
        
        //Chrome and firefox both need a tab index so the grid can recieve focus.
        //need to give the grid a tabindex if it doesn't already have one so
        //we'll just give it a tab index of the corresponding gridcache index 
        //that way we'll get the same result every time it is run.
        //configurable within the options.
        if (grid.config.tabIndex === -1){
            grid.$viewport.attr('tabIndex', self.getIndexOfCache(grid.gridId));
        } else {
            grid.$viewport.attr('tabIndex', grid.config.tabIndex);
        }

        $(window).resize(function () {
            var prevSizes = {
                rootMaxH: grid.elementDims.rootMaxH,
                rootMaxW: grid.elementDims.rootMaxW,
                rootMinH: grid.elementDims.rootMinH,
                rootMinW: grid.elementDims.rootMinW
            },
            scrollTop,
            isDifferent;
            
            // first check to see if the grid is hidden... if it is, we will screw a bunch of things up by re-sizing
            var $hiddens = grid.$root.parents(":hidden");
            if ($hiddens.length > 0) {
                return;
            }

            //catch this so we can return the viewer to their original scroll after the resize!
            scrollTop = grid.$viewport.scrollTop();

            kg.domUtility.measureGrid(grid.$root, grid);

            //check to see if anything has changed
            if (prevSizes.rootMaxH !== grid.elementDims.rootMaxH && grid.elementDims.rootMaxH !== 0) { // if display: none is set, then these come back as zeros
                isDifferent = true;
            } else if (prevSizes.rootMaxW !== grid.elementDims.rootMaxW && grid.elementDims.rootMaxW !== 0) {
                isDifferent = true;
            } else if (prevSizes.rootMinH !== grid.elementDims.rootMinH) {
                isDifferent = true;
            } else if (prevSizes.rootMinW !== grid.elementDims.rootMinW) {
                isDifferent = true;
            } else {
                return;
            }

            if (isDifferent) {

                grid.refreshDomSizes();

                grid.adjustScrollTop(scrollTop, true); //ensure that the user stays scrolled where they were
            }
        });
    };
    //#endregion
} ());