/// <reference path="GridClasses/Column.js" />
/// <reference path="namespace.js" />
/// <reference path="../lib/jquery-1.7.js" />
/// <reference path="constants.js" />
/// <reference path="../lib/knockout-latest.debug.js" />

kg.KoGrid = function (options, gridWidth) {
    var defaults = {
        rowHeight: 30,
        columnWidth: 100,
        headerRowHeight: 30,
        footerRowHeight: 55,
        filterRowHeight: 30,
        rowTemplate: ROW_TEMPLATE,
        headerTemplate: HEADERROW_TEMPLATE,
        headerCellTemplate: HEADERCELL_TEMPLATE,
        footerTemplate: FOOTER_TEMPLATE,
        footerVisible: ko.observable(true),
        canSelectRows: true,
        autogenerateColumns: true,
        data: null, //ko.observableArray
        columnDefs: ko.observableArray([]),
        pageSizes: [250, 500, 1000], //page Sizes
        enablePaging: false,
        pageSize: ko.observable(250), //Size of Paging data
        totalServerItems: ko.observable(), //ko.observable of how many items are on the server (for paging)
        currentPage: ko.observable(1), //ko.observable of what page they are currently on
        selectedItems: ko.observableArray([]), //ko.observableArray
        selectedIndex: ko.observable(0), //observable of the index of the selectedItem in the data array
        displaySelectionCheckbox: true, //toggles whether row selection check boxes appear
        displayRowIndex: true, //shows the rowIndex cell at the far left of each row
        useExternalFiltering: false,
        useExternalSorting: false,
        filterInfo: ko.observable(), //observable that holds filter information (fields, and filtering strings)
        sortInfo: ko.observable(), //observable similar to filterInfo
        filterWildcard: "*",
        includeDestroyed: false, // flag to show _destroy=true items in grid
        selectWithCheckboxOnly: false,
        keepLastSelectedAround: false,
        isMultiSelect: true,
        lastClickedRow: ko.observable(),
        tabIndex: -1,
        disableTextSelection: false,
        enableColumnResize: false, //turned off for now.
        selectAllInitialState: false
    },

    self = this,
    filterIsOpen = ko.observable(false), //observable so that the header can subscribe and change height when opened
    isSorting = false,
    prevScrollTop,
    prevMinRowsToRender,
    maxCanvasHt = 0,
    hUpdateTimeout;

    self.config = $.extend(defaults, options);

    self.filterManager = new kg.FilterManager(self.config);
    self.sortManager = new kg.SortManager({
        data: self.filterManager.filteredData,
        sortInfo: self.config.sortInfo,
        useExternalSorting: self.config.useExternalSorting
    });

    self.$root = undefined; //this is the root element that is passed in with the binding handler
    self.$topPanel = undefined;
    self.$headerContainer = undefined;
    self.$headerScroller = undefined;
    self.$headers = undefined;
    self.$viewport = undefined;
    self.$canvas = undefined;
    self.$footerPanel = undefined;
    self.width = ko.observable(gridWidth);
    self.selectionManager = undefined;
    self.selectedItemCount = undefined;
    //initialized in the init method
    self.rowManager = undefined;
    self.rows = undefined;
    self.headerRow = undefined;
    self.footer = undefined;
    self.gridId = "kg" + kg.utils.newId();
    self.initPhase = 0;
    self.toggleSelectAll = self.config.selectAllInitialState;

    self.sortInfo = self.sortManager.sortInfo; //observable
    self.filterInfo = self.filterManager.filterInfo; //observable
    self.finalData = self.sortManager.sortedData; //observable Array
    self.canvasHeight = ko.observable(maxCanvasHt.toString() + 'px');
    // set this during the constructor execution so that the
    // computed observables register correctly;
    self.data = self.config.data;
    
    //If column Defs are not observable, make them so. Will not update dynamically this way.
    if (options.columnDefs && !ko.isObservable(options.columnDefs)){
        var observableColumnDefs = ko.observableArray(options.columnDefs);
        options.columnDefs = observableColumnDefs;
    }
    
    // Set new default footer height if not overridden, and multi select is disabled
    if (self.config.footerRowHeight === defaults.footerRowHeight
        && !self.config.canSelectRows) {
        defaults.footerRowHeight = 30;
        self.config.footerRowHeight = 30;
    }

    self.maxRows = ko.computed(function () {
        var rows = self.finalData();
        maxCanvasHt = rows.length * self.config.rowHeight;
        self.canvasHeight(maxCanvasHt.toString() + 'px');
        return rows.length || 0;
    });

    self.maxCanvasHeight = function () {
        return maxCanvasHt || 0;
    };

    self.columns = ko.observableArray([]);

    self.elementDims = {
        scrollW: 0,
        scrollH: 0,
        cellHdiff: 0,
        cellWdiff: 0,
        rowWdiff: 0,
        rowHdiff: 0,
        rowIndexCellW: 25,
        rowSelectedCellW: 25,
        rootMaxW: 0,
        rootMaxH: 0,
        rootMinW: 0,
        rootMinH: 0
    };
    self.elementsNeedMeasuring = true;

    //#region Container Dimensions

    self.rootDim = ko.observable(new kg.Dimension({ outerHeight: 20000, outerWidth: 20000 }));

    self.headerDim = ko.computed(function () {
        var rootDim = self.rootDim(),
            filterOpen = filterIsOpen(),
            newDim = new kg.Dimension();

        newDim.outerHeight = self.config.headerRowHeight;
        newDim.outerWidth = rootDim.outerWidth;
        if (filterOpen) {
            newDim.outerHeight += self.config.filterRowHeight;
        }
        return newDim;
    });

    self.footerDim = ko.computed(function () {
        var rootDim = self.rootDim(),
            showFooter = self.config.footerVisible(),
            newDim = new kg.Dimension();

        newDim.outerHeight = self.config.footerRowHeight;
        newDim.outerWidth = rootDim.outerWidth;
        if (!showFooter) {
            newDim.outerHeight = 3;
        }
        return newDim;
    });

    self.viewportDim = ko.computed(function () {
        var rootDim = self.rootDim(),
            headerDim = self.headerDim(),
            footerDim = self.footerDim(),
            newDim = new kg.Dimension();

        newDim.outerHeight = rootDim.outerHeight - headerDim.outerHeight - footerDim.outerHeight;
        newDim.outerWidth = rootDim.outerWidth;
        newDim.innerHeight = newDim.outerHeight;
        newDim.innerWidth = newDim.outerWidth;
        return newDim;
    });

    self.totalRowWidth = ko.computed(function () {
        var totalWidth = 0,
            cols = self.columns(),
            numOfCols = self.columns().length,
            asterisksArray = [],
            percentArray = [],
            asteriskNum = 0;
        
        kg.utils.forEach(cols, function (col, i) {
            // get column width out of the observable
            var t = col.width();
            // check if it is a number
            if (isNaN(t)){
                // figure out if the width is defined or if we need to calculate it
                if (t == undefined) {
                    // set the width to the length of the header title +30 for sorting icons and padding
                    col.width((col.displayName.length * kg.domUtility.letterW) + 30); 
                } else if (t.indexOf("*") != -1) {
                    col.allowResize(false);
                    // if it is the last of the columns just configure it to use the remaining space
                    if (i + 1 == numOfCols && asteriskNum == 0){
                        col.width(self.width() - totalWidth);
                    } else { // otherwise we need to save it until the end to do the calulations on the remaining width.
                        asteriskNum += t.length;
                        asterisksArray.push(col);
                        return;
                    }
                } else if (kg.utils.endsWith(t, "%")){ // If the width is a percentage, save it until the very last.
                    percentArray.push(col);
                    return;
                } else { // we can't parse the width so lets throw an error.
                    throw "unable to parse column width, use percentage (\"10%\",\"20%\", etc...) or \"*\" to use remaining width of grid";
                }
            }
            // add the caluclated or pre-defined width the total width
            totalWidth += col.width();
            // set the flag as the width is configured so the subscribers can be added
            col.widthIsConfigured = true;
        });
        // check if we saved any asterisk columns for calculating later
        if (asterisksArray.length > 0){
            // get the remaining width
            var remainigWidth = self.width() - totalWidth;
            // calculate the weight of each asterisk rounded down
            var asteriskVal = Math.floor(remainigWidth / asteriskNum);
            // set the width of each column based on the number of stars
            kg.utils.forEach(asterisksArray, function (col) {
                var t = col.width().length;
                col.width(asteriskVal * t);
                totalWidth += col.width();
            });
        }
        // Now we check if we saved any percentage columns for calculating last
        if (percentArray.length > 0){
            // do the math
            kg.utils.forEach(percentArray, function (col) {
                var t = col.width();
                col.width(Math.floor(self.width() * (parseInt(t.slice(0, - 1)) / 100)));
                totalWidth += col.width();
            });
        }
        return totalWidth;
    });

    self.minRowsToRender = ko.computed(function () {
        var viewportH = self.viewportDim().outerHeight || 1;

        if (filterIsOpen()) {
            return prevMinRowsToRender;
        };

        prevMinRowsToRender = Math.floor(viewportH / self.config.rowHeight);

        return prevMinRowsToRender;
    });

    self.headerScrollerDim = ko.computed(function () {
        var viewportH = self.viewportDim().outerHeight,
            maxHeight = self.maxCanvasHeight(),
            vScrollBarIsOpen = (maxHeight > viewportH),
            newDim = new kg.Dimension();

        newDim.autoFitHeight = true;
        newDim.outerWidth = self.totalRowWidth();

        if (vScrollBarIsOpen) { newDim.outerWidth += self.elementDims.scrollW; }
        else if ((maxHeight - viewportH) <= self.elementDims.scrollH) { //if the horizontal scroll is open it forces the viewport to be smaller
            newDim.outerWidth += self.elementDims.scrollW;
        }
        return newDim;
    });
    
    self.sortData = function (col, dir) {
        isSorting = true;

        kg.utils.forEach(self.columns(), function (column) {
            if (column.field !== col.field) {
                if (column.sortDirection() !== "") { column.sortDirection(""); }
            }
        });
        self.sortManager.sort(col, dir);
        isSorting = false;
    };

    //#endregion

    //keep selected item scrolled into view
    self.finalData.subscribe(function () {
         if (self.config.selectedItems()) {
            var lastItemIndex = self.config.selectedItems().length - 1;
            if (lastItemIndex <= 0) {
                var item = self.config.selectedItems()[lastItemIndex];
                if (item) {
                   scrollIntoView(item);
                }
            }
        }
    });

    var scrollIntoView = function (entity) {
        var itemIndex = -1,
            viewableRange = self.rowManager.viewableRange();

        if (entity) {
            itemIndex = ko.utils.arrayIndexOf(self.finalData(), entity);
        }
        if (itemIndex > -1) {
            //check and see if its already in view!
            if (itemIndex > viewableRange.topRow || itemIndex < viewableRange.bottomRow - 5) {

                //scroll it into view
                self.rowManager.viewableRange(new kg.Range(itemIndex, itemIndex + self.minRowsToRender()));

                if (self.$viewport) {
                    self.$viewport.scrollTop(itemIndex * self.config.rowHeight);
                }
            }
        };
    };

    self.refreshDomSizes = function () {
        var dim = new kg.Dimension(),
            oldDim = self.rootDim(),
            rootH,
            rootW,
            canvasH;

        self.elementsNeedMeasuring = true;
        //calculate the POSSIBLE biggest viewport height
        rootH = self.maxCanvasHeight() + self.config.headerRowHeight + self.config.footerRowHeight;
        //see which viewport height will be allowed to be used
        rootH = Math.min(self.elementDims.rootMaxH, rootH);
        rootH = Math.max(self.elementDims.rootMinH, rootH);
        //now calc the canvas height of what is going to be used in rendering
        canvasH = rootH - self.config.headerRowHeight - self.config.footerRowHeight;
        //get the max row Width for rendering
        rootW = self.totalRowWidth() + self.elementDims.rowWdiff;
        //now see if we are going to have a vertical scroll bar present
        if (self.maxCanvasHeight() > canvasH) {
            //if we are, then add that width to the max width 
            rootW += self.elementDims.scrollW || 0;
        }
        //now see if we are constrained by any width dimensions
        dim.outerWidth = Math.min(self.elementDims.rootMaxW, rootW);
        dim.outerWidth = Math.max(self.elementDims.rootMinW, dim.outerWidth);
        dim.outerHeight = rootH;
        //finally don't fire the subscriptions if we aren't changing anything!
        if (dim.outerHeight !== oldDim.outerHeight || dim.outerWidth !== oldDim.outerWidth) {

            //if its not the same, then fire the subscriptions
            self.rootDim(dim);
        }
    };

    self.refreshDomSizesTrigger = ko.computed(function () {
        //register dependencies
        if (hUpdateTimeout) {
            if (window.setImmediate) {
                window.clearImmediate(hUpdateTimeout);
            } else {
                window.clearTimeout(hUpdateTimeout);
            }
        }
        if (self.initPhase > 0) {
            //don't shrink the grid if we sorting or filtering
            if (!filterIsOpen() && !isSorting) {
                self.refreshDomSizes();
                kg.buildCSSStyles(self);
                if (self.initPhase > 0 && self.$root) {
                    self.$root.show();
                }
            }
        }
    });

    self.buildColumnDefsFromData = function () {
        if (self.config.columnDefs().length > 0){
            return;
        }
        if (!self.data() || !self.data()[0]) {
            // TODO: Late bind the column generation maybe set up a subcsription?
            throw 'If auto-generating columns, "data" cannot be of null or undefined type!';
        }
        var item;
        item = self.data()[0];
        kg.utils.forIn(item, function (prop, propName) {
            if (propName === SELECTED_PROP) {
                return;
            }
            self.config.columnDefs().push({
                field: propName
            });
        });
    };

    self.buildColumns = function () {
        var columnDefs = self.config.columnDefs,
            cols = [];

        if (self.config.autogenerateColumns) { self.buildColumnDefsFromData(); }
        if (self.config.displaySelectionCheckbox) {
            columnDefs().splice(0, 0, { field: SELECTED_PROP, width: self.elementDims.rowSelectedCellW });
        }
        if (self.config.displayRowIndex) {
            columnDefs().splice(0, 0, { field: 'rowIndex', width: self.elementDims.rowIndexCellW });
        }
        var createColumnSortClosure = function(col) {
            return function(dir) {
                if (dir) {
                    self.sortData(col, dir);
                }
            };
        };
        if (columnDefs().length > 0) {
            kg.utils.forEach(columnDefs(), function (colDef, i) {
                var column = new kg.Column(colDef, i);
                column.sortDirection.subscribe(createColumnSortClosure(column));                
                column.filter.subscribe(self.filterManager.createFilterChangeCallback(column));
                cols.push(column);
            });
            self.columns(cols);
        }
    };

    self.init = function () {
        self.buildColumns();
        //now if we are using the default templates, then make the generated ones unique
        if (self.config.rowTemplate === ROW_TEMPLATE) {
            self.config.rowTemplate = self.gridId + self.config.rowTemplate;
        }
        if (self.config.headerTemplate === HEADERROW_TEMPLATE) {
            self.config.headerTemplate = self.gridId + self.config.headerTemplate;
        }
        self.rowManager = new kg.RowManager(self);
        self.selectionManager = new kg.SelectionManager({
            isMultiSelect: self.config.isMultiSelect,
            data: self.finalData,
            selectedItem: self.config.selectedItem,
            selectedItems: self.config.selectedItems,
            selectedIndex: self.config.selectedIndex,
            lastClickedRow: self.config.lastClickedRow,
            isMulti: self.config.isMultiSelect
        }, self.rowManager);
        kg.utils.forEach(self.columns(), function(col) {
            if (col.widthIsConfigured){
                col.width.subscribe(function(){
                    self.rowManager.dataChanged = true;
                    self.rowManager.rowCache = []; //if data source changes, kill this!
                    self.rowManager.calcRenderedRange();
                });
            }
        });
        self.selectedItemCount = self.selectionManager.selectedItemCount;
        self.toggleSelectAll = self.selectionManager.toggleSelectAll;
        self.rows = self.rowManager.rows; // dependent observable
        kg.buildCSSStyles(self);
        self.initPhase = 1;
    };

    self.update = function () {
        //we have to update async, or else all the observables are registered as dependencies
        var updater = function () {
            self.refreshDomSizes();
            kg.buildCSSStyles(self);
            if (self.initPhase > 0 && self.$root) {
                self.$root.show();
            }
        };
        if (window.setImmediate) {
            hUpdateTimeout = window.setImmediate(updater);
        } else {
            hUpdateTimeout = setTimeout(updater, 0);
        }
    };

    self.showFilter_Click = function () {
        var isOpen = (filterIsOpen() ? false : true);
        self.headerRow.filterVisible(isOpen);
        filterIsOpen(isOpen);
    };

    self.clearFilter_Click = function () {
        kg.utils.forEach(self.columns(), function (col) {
            col.filter(null);
        });
    };

    self.adjustScrollTop = function (scrollTop, force) {
        var rowIndex;
        if (prevScrollTop === scrollTop && !force) { return; }
        rowIndex = Math.floor(scrollTop / self.config.rowHeight);
        prevScrollTop = scrollTop;
        self.rowManager.viewableRange(new kg.Range(rowIndex, rowIndex + self.minRowsToRender()));
    };

    self.adjustScrollLeft = function (scrollLeft) {
        if (self.$headerContainer) {
            self.$headerContainer.scrollLeft(scrollLeft);
        }
    };

    //call init
    self.init();
};