import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick, h } from 'vue'
import ChildTable from '../../src/runtime/app/components/nct/crud/ChildTable.vue'
import RowActions from '../../src/runtime/app/components/nct/crud/RowActions.vue'
import type { NctSchemaDefinition } from '../../src/runtime/shared/types/schema'
import type { NctPrintTemplateProps } from '../../src/runtime/shared/types/print'

vi.mock('#app', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#app')>()
  return {
    ...actual,
    useAppConfig: () => ({ crud: {} }),
    useNuxtApp: () => ({ $nctUser: { value: null } }),
  }
})

mockNuxtImport('nctHasPermission', () => vi.fn(() => true))
mockNuxtImport('nctHasRowPermission', () => vi.fn(() => true))

const columns = [
  { key: 'quantity', label: 'Quantity' },
  { key: 'linetotal', label: 'Line total', align: 'right' as const },
]

const rows = [
  { id: 1, order_id: 10, product_id: 1, quantity: 2, linetotal: 40 },
  { id: 2, order_id: 10, product_id: 2, quantity: 1, linetotal: 15 },
]

const orderitemsSchema: NctSchemaDefinition = {
  resource: 'orderitems',
  labelField: 'id',
  fields: [
    { name: 'id', type: 'number' },
    { name: 'order_id', type: 'number', references: 'orders' },
    { name: 'product_id', type: 'number', references: 'products' },
    { name: 'quantity', type: 'number', required: true },
  ],
}

describe('ChildTable.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  afterEach(() => {
    // Teleport target (document.body) isn't cleaned up automatically between tests.
    document.body.innerHTML = ''
  })

  describe('read-only rendering (no resource/schema)', () => {
    it('renders column headers and formatted row values with no actions column', async () => {
      const wrapper = await mountSuspended(ChildTable, { props: { columns, rows } })

      expect(wrapper.text()).toContain('Quantity')
      expect(wrapper.text()).toContain('Line total')
      expect(wrapper.text()).toContain('40')
      expect(wrapper.findComponent(RowActions).exists()).toBe(false)
    })

    it('does not render the "Add New" button without resource/schema', async () => {
      const wrapper = await mountSuspended(ChildTable, { props: { columns, rows } })
      expect(wrapper.text()).not.toContain('Add New')
    })
  })

  describe('CRUD actions (resource + schema provided)', () => {
    it('renders RowActions per row with the child resource, row, and schema', async () => {
      const wrapper = await mountSuspended(ChildTable, {
        props: { columns, rows, resource: 'orderitems', schema: orderitemsSchema },
      })

      const actions = wrapper.findAllComponents(RowActions)
      expect(actions).toHaveLength(2)
      expect(actions[0]!.props('resource')).toBe('orderitems')
      expect(actions[0]!.props('row')).toEqual(rows[0])
      expect(actions[0]!.props('schema')).toEqual(orderitemsSchema)
    })

    it('does NOT render RowActions when only resource is provided (schema missing)', async () => {
      const wrapper = await mountSuspended(ChildTable, {
        props: { columns, rows, resource: 'orderitems' },
      })
      expect(wrapper.findComponent(RowActions).exists()).toBe(false)
    })
  })

  describe('"Add New" child row (FK pre-fill)', () => {
    it('shows the button and pre-fills the resolved parent FK field when parentResource/parentRowId are set', async () => {
      const wrapper = await mountSuspended(ChildTable, {
        props: {
          columns,
          rows,
          resource: 'orderitems',
          schema: orderitemsSchema,
          parentResource: 'orders',
          parentRowId: 10,
        },
      })

      expect(wrapper.text()).toContain('Add New')

      const createRow = wrapper.findComponent({ name: 'NctCrudCreateRow' })
      expect(createRow.exists()).toBe(true)
      expect(createRow.props('initialState')).toEqual({ order_id: 10 })
    })

    it('omits the button when no schema field references parentResource', async () => {
      const wrapper = await mountSuspended(ChildTable, {
        props: {
          columns,
          rows,
          resource: 'orderitems',
          schema: orderitemsSchema,
          parentResource: 'customers', // no field in orderitemsSchema references 'customers'
          parentRowId: 10,
        },
      })

      expect(wrapper.text()).not.toContain('Add New')
    })

    it('omits the button when parentRowId is missing', async () => {
      const wrapper = await mountSuspended(ChildTable, {
        props: {
          columns,
          rows,
          resource: 'orderitems',
          schema: orderitemsSchema,
          parentResource: 'orders',
        },
      })

      expect(wrapper.text()).not.toContain('Add New')
    })

    it('omits the button when the user lacks create permission', async () => {
      const { nctHasPermission } = await import('#imports')
      vi.mocked(nctHasPermission).mockReturnValue(false)

      const wrapper = await mountSuspended(ChildTable, {
        props: {
          columns,
          rows,
          resource: 'orderitems',
          schema: orderitemsSchema,
          parentResource: 'orders',
          parentRowId: 10,
        },
      })

      expect(wrapper.text()).not.toContain('Add New')
    })
  })


  describe('print', () => {
    let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined

    afterEach(() => {
        // Unmount first so Vue tears down the Teleport (and its anchor nodes
        // inside document.body) through its own lifecycle, rather than us
        // ripping the DOM out from under it via innerHTML — that leaves Vue's
        // internal vnode/anchor tracking pointing at nodes that no longer
        // exist, corrupting the *next* test's teleport (manifests as
        // "insertBefore on null" one test later, not in the test that
        // actually caused it).
        wrapper?.unmount()
        wrapper = undefined
    })

    it('shows the Print button when there are rows', async () => {
        wrapper = await mountSuspended(ChildTable, { props: { columns, rows } })
        expect(wrapper.text()).toContain('Print')
    })

    it('hides the Print button when there are no rows and no "Add New" button', async () => {
        wrapper = await mountSuspended(ChildTable, { props: { columns, rows: [] } })
        expect(wrapper.text()).not.toContain('Print')
    })

    it('reveals the teleported print area and calls window.print on trigger', async () => {
        wrapper = await mountSuspended(ChildTable, { props: { columns, rows, resource: 'orderitems' } })

        const instance = wrapper.vm as unknown as { triggerPrint: () => Promise<void>, isPrinting: boolean }
        await instance.triggerPrint()

        expect(instance.isPrinting).toBe(true)
        expect(window.print).toHaveBeenCalledTimes(1)
    })

    it('hides the print area again after the afterprint event fires', async () => {
        wrapper = await mountSuspended(ChildTable, { props: { columns, rows, resource: 'orderitems' } })

        const instance = wrapper.vm as unknown as { triggerPrint: () => Promise<void>, isPrinting: boolean }
        await instance.triggerPrint()
        expect(instance.isPrinting).toBe(true)

        window.dispatchEvent(new Event('afterprint'))
        await nextTick()

        expect(instance.isPrinting).toBe(false)
    })

    it('forwards resource, schema, columns, rows, footer, parentResource, and parentRow to the print-template slot', async () => {
    const footer = new Map([['linetotal', [{ label: 'Total', value: 55 }]]])
    const parentRow = { id: 10, num: 'ORD-1' }

    wrapper = await mountSuspended(ChildTable, {
        props: {
        columns,
        rows,
        footer,
        resource: 'orderitems',
        schema: orderitemsSchema,
        parentResource: 'orders',
        parentRowId: 10,
        parentRow,
        },
        slots: {
        'print-template': (slotProps: NctPrintTemplateProps) =>
            h('div', { 'data-testid': 'print-slot' }, JSON.stringify({
            resource: slotProps.resource,
            rowCount: slotProps.rows.length,
            parentResource: slotProps.parentResource,
            parentRowNum: (slotProps.parentRow as { num?: string } | undefined)?.num,
            hasFooter: !!slotProps.footer,
            })),
        },
    })

    const instance = wrapper.vm as unknown as { triggerPrint: () => Promise<void> }
    await instance.triggerPrint()

    const printed = document.body.querySelector('[data-testid="print-slot"]')
    expect(printed).not.toBeNull()
    const payload = JSON.parse(printed!.textContent!)
    expect(payload).toEqual({
        resource: 'orderitems',
        rowCount: 2,
        parentResource: 'orders',
        parentRowNum: 'ORD-1',
        hasFooter: true,
    })
    })

    it('does not render the print-template slot at all when no resource is provided', async () => {
        wrapper = await mountSuspended(ChildTable, {
            props: { columns, rows },
            slots: {
                'print-template': () => '<div data-testid="print-slot" />',
            },
        })

        const instance = wrapper.vm as unknown as { triggerPrint: () => Promise<void> }
        await instance.triggerPrint()

        expect(document.body.querySelector('[data-testid="print-slot"]')).toBeNull()
    })
  })
})