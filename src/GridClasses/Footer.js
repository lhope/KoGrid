kg.Footer = function (grid) {
    var self = this;

    self.maxRows = undefined;

    if (grid.config.totalServerItems() !== null && grid.config.totalServerItems() !== undefined) {
        self.maxRows = grid.config.totalServerItems; //observable
    } else {
        self.maxRows = grid.maxRows; //observable
    }
    self.isMultiSelect = ko.observable(grid.config.canSelectRows && grid.config.isMultiSelect);
    self.selectedItemCount = grid.selectedItemCount; //observable

    self.footerVisible = grid.config.footerVisible;
    self.pagerVisible = ko.observable(grid.config.enablePaging);
    self.selectedPageSize = grid.config.pageSize; //observable
    self.pageSizes = ko.observableArray(grid.config.pageSizes);
    self.currentPage = grid.config.currentPage; //observable
    self.maxPages = ko.computed(function () {
        var maxCnt = self.maxRows() || 1,
            pageSize = self.selectedPageSize();
        return Math.ceil(maxCnt / pageSize);
    });

    self.protectedCurrentPage = ko.computed({
        read: function () {
            return self.currentPage();
        },
        write: function (page) {
            var pageInt = parseInt(page);
            if (!isNaN(pageInt) || (pageInt && pageInt <= self.maxPages() && pageInt > 0)) {
                self.currentPage(pageInt); //KO does an equality check on primitives before notifying subscriptions here
            }
        },
        owner: self
    });

    self.pageForward = function() {
        var page = self.currentPage();
        self.currentPage(Math.min(page + 1, self.maxPages()));
    };

    self.pageBackward = function () {
        var page = self.currentPage();
        self.currentPage(Math.max(page - 1, 1));
    };

    self.pageToFirst = function () {
        self.currentPage(1);
    };

    self.pageToLast = function () {
        var maxPages = self.maxPages();
        self.currentPage(maxPages);
    };

    self.canPageForward = ko.computed(function () {
        var curPage = self.currentPage();
        var maxPages = self.maxPages();
        return curPage < maxPages;
    });

    self.canPageBackward = ko.computed(function () {
        var curPage = self.currentPage();
        return curPage > 1;
    });
};