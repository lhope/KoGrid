kg.HeaderRow = function () {
    this.headerCells = [];
    this.height = undefined;
    this.headerCellMap = {};
    this.filterVisible = ko.observable(false);
};