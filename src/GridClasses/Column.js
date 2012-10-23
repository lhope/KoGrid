kg.Column = function (colDef, index) {
    var self = this,
        minWisOb = ko.isObservable(colDef.minWidth),
        maxWisOb = ko.isObservable(colDef.maxWidth);
        
    self.width = ko.observable(colDef.width);
    self.widthIsConfigured = false;
    self.minWidth = minWisOb ? colDef.minWidth : ( !colDef.minWidth ? ko.observable(50) : ko.observable(colDef.minWidth));
    self.maxWidth = maxWisOb ? colDef.maxWidth : ( !colDef.maxWidth ? ko.observable(9000) : ko.observable(colDef.maxWidth));
    
    self.field = colDef.field;
    if (!colDef.displayName) {
        // Allow empty column names -- do not check for empty string
        colDef.displayName = colDef.field;
    }
    self.displayName = colDef.displayName;
    self.index = index;
    self.isVisible = ko.observable(false);

    //sorting
    if (colDef.sortable === undefined || colDef.sortable === null) {
        colDef.sortable = true;
    }
    
    //resizing
    if (colDef.resizable === undefined || colDef.resizable === null) {
        colDef.resizable = true;
    }
    //resizing
    if (colDef.filterable === undefined || colDef.filterable === null) {
        colDef.filterable = true;
    }
    
    self.allowSort = ko.observable(colDef.sortable);
    self.allowResize = ko.observable(colDef.resizable);
    self.allowFilter = colDef.filterable;
    
    self.sortDirection = ko.observable("");
    self.sortingAlgorithm = colDef.sortFn;

    //filtering
    self.filter = ko.observable();

    //cell Template
    self.cellTemplate = colDef.cellTemplate; // string of the cellTemplate script element id
    self.hasCellTemplate = (self.cellTemplate ? true : false);
    if (self.hasCellTemplate){
        var elem = document.getElementById(self.cellTemplate);
        var templText = elem ? elem.innerHTML : undefined;
        kg.templateManager.addTemplateSafe(self.cellTemplate, templText);
    }
    self.cellClass = colDef.cellClass;
    self.headerClass = colDef.headerClass;

    self.headerTemplate = colDef.headerTemplate;
    self.hasHeaderTemplate = (self.headerTemplate ? true : false);
};