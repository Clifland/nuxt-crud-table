import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PrintItems from '../../src/runtime/app/components/nct/crud/PrintItems.vue'

const columns = [
  { key: 'quantity', label: 'Quantity' },
  { key: 'linetotal', label: 'Line total', align: 'right' as const },
  { key: 'product.name', label: 'Product' },
]

const rows = [
  { id: 1, quantity: 2, linetotal: 40, product: { name: 'Widget' } },
  { id: 2, quantity: 1, linetotal: 15, product: { name: 'Gadget' } },
]

describe('PrintItems.vue', () => {
  describe('rendering', () => {
    it('renders a header cell per column, in order', async () => {
      const wrapper = await mountSuspended(PrintItems, { props: { columns, rows: [] } })
      const headers = wrapper.findAll('thead th').map(th => th.text())

      expect(headers).toEqual(['Quantity', 'Line total', 'Product'])
    })

    it('renders one body row per record', async () => {
      const wrapper = await mountSuspended(PrintItems, { props: { columns, rows } })
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    })

    it('resolves dot-path columns against side-loaded relation data', async () => {
      const wrapper = await mountSuspended(PrintItems, { props: { columns, rows } })
      expect(wrapper.text()).toContain('Widget')
      expect(wrapper.text()).toContain('Gadget')
    })

    it('formats ISO date-string values via formatCellValue rather than printing the raw string', async () => {
      const dateColumns = [{ key: 'created_at', label: 'Created' }]
      const dateRows = [{ id: 1, created_at: '2026-01-15T10:30:00.000Z' }]

      const wrapper = await mountSuspended(PrintItems, { props: { columns: dateColumns, rows: dateRows } })

      expect(wrapper.text()).not.toContain('2026-01-15T10:30:00.000Z')
      expect(wrapper.find('tbody td').text().length).toBeGreaterThan(0)
    })

    it('falls back to the row index for the :key when a row has no id', async () => {
      const noIdRows = [{ quantity: 1 }, { quantity: 2 }]
      const wrapper = await mountSuspended(PrintItems, { props: { columns, rows: noIdRows } })
      // No thrown key-collision warning path to assert directly — this just
      // guards against a render crash when `row.id` is undefined.
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    })
  })

  describe('alignment', () => {
    it('right-aligns a column flagged align: "right", in both header and body cells', async () => {
      const wrapper = await mountSuspended(PrintItems, { props: { columns, rows } })

      const headerCells = wrapper.findAll('thead th')
      expect(headerCells[1]!.classes()).toContain('text-right')
      expect(headerCells[0]!.classes()).toContain('text-left')

      const firstRowCells = wrapper.findAll('tbody tr')[0]!.findAll('td')
      expect(firstRowCells[1]!.classes()).toContain('text-right')
      expect(firstRowCells[0]!.classes()).toContain('text-left')
    })

    it('defaults to left alignment when align is omitted', async () => {
      const wrapper = await mountSuspended(PrintItems, { props: { columns, rows } })
      const headerCells = wrapper.findAll('thead th')
      expect(headerCells[2]!.classes()).toContain('text-left')
    })
  })

  describe('footer', () => {
    it('renders no tfoot when footer is omitted', async () => {
      const wrapper = await mountSuspended(PrintItems, { props: { columns, rows } })
      expect(wrapper.find('tfoot').exists()).toBe(false)
    })

    it('renders footer cells under their matching column, with label and value', async () => {
      const footer = new Map([['linetotal', [{ label: 'Total Amount', value: 55 }]]])
      const wrapper = await mountSuspended(PrintItems, { props: { columns, rows, footer } })

      const footerCells = wrapper.findAll('tfoot td')
      expect(footerCells).toHaveLength(3)
      expect(footerCells[1]!.text()).toContain('55')
      expect(footerCells[1]!.text()).toContain('Total Amount')
      // Columns with no matching footer entry render an empty cell, not a crash.
      expect(footerCells[0]!.text()).toBe('')
    })

    it('respects column alignment in the footer row too', async () => {
      const footer = new Map([['linetotal', [{ label: 'Total', value: 55 }]]])
      const wrapper = await mountSuspended(PrintItems, { props: { columns, rows, footer } })

      const footerCells = wrapper.findAll('tfoot td')
      expect(footerCells[1]!.classes()).toContain('text-right')
      expect(footerCells[0]!.classes()).toContain('text-left')
    })

    it('stacks multiple footer values under the same column when more than one aggregate targets it', async () => {
      const footer = new Map([
        ['linetotal', [
          { label: 'Sum', value: 55 },
          { label: 'Avg', value: 27.5 },
        ]],
      ])
      const wrapper = await mountSuspended(PrintItems, { props: { columns, rows, footer } })

      const linetotalFooterCell = wrapper.findAll('tfoot td')[1]!.text()
      expect(linetotalFooterCell).toContain('55')
      expect(linetotalFooterCell).toContain('Sum')
      expect(linetotalFooterCell).toContain('27.5')
      expect(linetotalFooterCell).toContain('Avg')
    })
  })
})