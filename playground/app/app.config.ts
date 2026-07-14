/**
 * This is NOT a full app.config.ts — just the addition to make to your
 * existing playground/app/app.config.ts (the `printTemplates` block below,
 * added inside the existing `crud` key).
 */
export default defineAppConfig({
  crud: {
    tableHiddenFields: {
      default: ['updated_at'],
    },
    formHiddenFields: {
      resources: {
        orderitems: ['price'],
      },
    },
    aggregates: {
      orderitems: {
        columns: [
          { name: 'linetotal', label: 'Line total', fn: 'multiply', args: ['price', 'quantity'] },
        ],
        footer: [
          { name: 'total_amount', label: 'Total Amount', fn: 'sum', args: ['linetotal'] },
        ],
      },
    },

    // NEW — maps a child resource's plural API name to a custom print
    // template's Nuxt-global component name. Any child resource not listed
    // here still gets a working "Print" button; it just prints the raw
    // column/row data with no header or footer branding.
    printTemplates: {
      orderitems: 'InvoiceTemplate',
    },
  },
})