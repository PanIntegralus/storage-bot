function formatString(template, ...values) {
    return template.replace(/\{(\d+)\}/g, (match, index) => {
        return typeof values[index] !== 'undefined' ? values[index] : match;
    });
};

module.exports = { formatString };