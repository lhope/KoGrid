ko.bindingHandlers['mouseEvents'] = (function () {
    return {
        'init': function (element, valueAccessor) {
            var eFuncs = valueAccessor();
            if (eFuncs.mouseDown) {
                $(element).mousedown(eFuncs.mouseDown);
            }
        },
        'update': function () {
        }
    };
}());