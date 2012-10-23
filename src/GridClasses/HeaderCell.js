kg.HeaderCell = function (col) {
    var self = this;

    self.colIndex = col.colIndex;
    self.displayName = col.displayName;
    self.field = col.field;
    self.column = col;
    self.colToRight = col.colToRight;
    self.headerClass = col.headerClass;
    self.headerTemplate = col.headerTemplate;
    self.hasHeaderTemplate = col.hasHeaderTemplate;
    
    self.allowSort = col.allowSort;
    self.allowResize = col.allowResize;
    self.allowFilter = col.allowFilter;

    self.left = col.left;
    self.width = col.width;
    self.minWidth = col.minWidth;
    self.maxWidth = col.maxWidth;

    self.filter = ko.computed({
        read: function () {
            return self.column.filter();
        },
        write: function (val) {
            self.column.filter(val);
        }
    });

    self.filterVisible = ko.observable(false);
    self._filterVisible = ko.computed({
        read: function () {
            return self.allowFilter;
        },
        write: function (val) {
            self.filterVisible(val);
        }
    });
    
    self.sortAscVisible = ko.computed(function () {
        return self.column.sortDirection() === "asc";
    });

    self.sortDescVisible = ko.computed(function () {
        return self.column.sortDirection() === "desc";
    });

    self.noSortVisible = ko.computed(function () {
        var sortDir = self.column.sortDirection();

        return sortDir !== "asc" && sortDir !== "desc";
    });

    self.sort = function () {
        if (!self.allowSort()) {
            return; // column sorting is disabled, do nothing
        }
        var dir = self.column.sortDirection() === "asc" ? "desc" : "asc";
        self.column.sortDirection(dir);
    };

    self.filterHasFocus = ko.observable(false);
    self.startMousePosition = 0;
    self.origWidth = 0;
    self.gripOnMouseUp = function () {
        $(document).off('mousemove');
        $(document).off('mouseup');
        document.body.style.cursor = 'default';
        return false;
    };
    self.onMouseMove = function (event) {
        var diff = event.clientX - self.startMousePosition;
        var newWidth = diff + self.origWidth;
        var setWidth = newWidth < self.minWidth() ? self.minWidth() : (newWidth > self.maxWidth() ? self.maxWidth() : newWidth);
        self.width(setWidth);
        if (self.colToRight) {
            var orignLeft = self.colToRight.left();
            self.colToRight.left(orignLeft + diff);
        }
        return false;
    };
    self.gripOnMouseDown = function (event) {
        self.startMousePosition = event.clientX;
        self.origWidth = self.width();
        $(document).mousemove(self.onMouseMove);
        $(document).mouseup(self.gripOnMouseUp);
        document.body.style.cursor = 'col-resize';
        event.target.parentElement.style.cursor = 'col-resize';
        return false;
    };
};