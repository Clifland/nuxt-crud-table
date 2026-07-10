import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useNctAggregates } from '../../src/runtime/composables/useNctAggregates'
import type { NctAggregatesConfig } from '../../src/runtime/shared/types/config'

describe('useNctAggregates', () => {
  describe('withVirtualColumns — row-level operations', () => {
    const rows = [
      { id: 1, price: 100, quantity: 2 },
      { id: 2, price: 50, quantity: 3 },
    ]

    it('computes multiply', () => {
      const config: NctAggregatesConfig = {
        orderitems: { columns: [{ name: 'linetotal', label: 'Line total', fn: 'multiply', args: ['price', 'quantity'] }] },
      }
      const result = useNctAggregates(rows, config).withVirtualColumns('orderitems').value
      expect(result[0]!.linetotal).toBe(200)
      expect(result[1]!.linetotal).toBe(150)
    })

    it('computes add', () => {
      const config: NctAggregatesConfig = {
        orderitems: { columns: [{ name: 'r', label: 'R', fn: 'add', args: ['price', 'quantity'] }] },
      }
      const result = useNctAggregates(rows, config).withVirtualColumns('orderitems').value
      expect(result[0]!.r).toBe(102)
    })

    it('computes subtract', () => {
      const config: NctAggregatesConfig = {
        orderitems: { columns: [{ name: 'r', label: 'R', fn: 'subtract', args: ['price', 'quantity'] }] },
      }
      const result = useNctAggregates(rows, config).withVirtualColumns('orderitems').value
      expect(result[0]!.r).toBe(98)
    })

    it('computes divide', () => {
      const config: NctAggregatesConfig = {
        orderitems: { columns: [{ name: 'r', label: 'R', fn: 'divide', args: ['price', 'quantity'] }] },
      }
      const result = useNctAggregates(rows, config).withVirtualColumns('orderitems').value
      expect(result[0]!.r).toBe(50)
    })

    it('resolves dot-notation field paths as args', () => {
      const nestedRows = [{ id: 1, product: { price: 20 }, quantity: 3 }]
      const config: NctAggregatesConfig = {
        orderitems: { columns: [{ name: 'linetotal', label: 'Line total', fn: 'multiply', args: ['product.price', 'quantity'] }] },
      }
      const result = useNctAggregates(nestedRows, config).withVirtualColumns('orderitems').value
      expect(result[0]!.linetotal).toBe(60)
    })

    it('returns null when a required arg is missing on the row', () => {
      const rowsMissingQty = [{ id: 1, price: 100 }]
      const config: NctAggregatesConfig = {
        orderitems: { columns: [{ name: 'linetotal', label: 'Line total', fn: 'multiply', args: ['price', 'quantity'] }] },
      }
      const result = useNctAggregates(rowsMissingQty, config).withVirtualColumns('orderitems').value
      expect(result[0]!.linetotal).toBeNull()
    })

    it('returns null when args is empty/undefined', () => {
      const config: NctAggregatesConfig = {
        orderitems: { columns: [{ name: 'linetotal', label: 'Line total', fn: 'multiply', args: [] }] },
      }
      const result = useNctAggregates(rows, config).withVirtualColumns('orderitems').value
      expect(result[0]!.linetotal).toBeNull()
    })

    it('leaves rows unchanged when the resource has no configured columns', () => {
      const result = useNctAggregates(rows, {}).withVirtualColumns('orderitems').value
      expect(result).toEqual(rows)
    })
  })

  describe('withVirtualColumns — reduce-op rollup nested inside a row (not a footer)', () => {
    it('sums a nested child array directly onto the parent row', () => {
      const orders = [{
        id: 1,
        orderitems: [
          { id: 1, price: 100, quantity: 2 },
          { id: 2, price: 50, quantity: 3 },
        ],
      }]
      const config: NctAggregatesConfig = {
        orderitems: {
          columns: [{ name: 'linetotal', label: 'Line total', fn: 'multiply', args: ['price', 'quantity'] }],
        },
        orders: {
          columns: [{ name: 'order_total', label: 'Order Total', fn: 'sum', args: ['orderitems.linetotal'] }],
        },
      }
      const result = useNctAggregates(orders, config).withVirtualColumns('orders').value
      expect(result[0]!.order_total).toBe(350) // (100*2) + (50*3)
    })
  })

  describe('footerValues — reductions across sibling rows', () => {
    const rows = [
      { id: 1, price: 100, quantity: 2 },
      { id: 2, price: 50, quantity: 3 },
    ]
    const columns: NctAggregatesConfig['orderitems']['columns'] = [
      { name: 'linetotal', label: 'Line total', fn: 'multiply', args: ['price', 'quantity'] },
    ]

    it('computes sum over a virtual column', () => {
      const config: NctAggregatesConfig = {
        orderitems: { columns, footer: [{ name: 'total_amount', label: 'Total Amount', fn: 'sum', args: ['linetotal'] }] },
      }
      const footer = useNctAggregates(rows, config).footerValues('orderitems')
      expect(footer).toEqual([{ name: 'total_amount', label: 'Total Amount', args: ['linetotal'], value: 350 }])
    })

    it.each([
      ['count', 2],
      ['avg', 175],
      ['min', 150],
      ['max', 200],
    ])('computes %s', (fn, expected) => {
      const config: NctAggregatesConfig = {
        orderitems: { columns, footer: [{ name: 'r', label: 'R', fn: fn as any, args: ['linetotal'] }] },
      }
      expect(useNctAggregates(rows, config).footerValues('orderitems')[0]!.value).toBe(expected)
    })

    it('falls back to fn name as label when label is omitted', () => {
      const config: NctAggregatesConfig = {
        orderitems: { columns, footer: [{ name: 'r', fn: 'sum', args: ['linetotal'] }] },
      }
      expect(useNctAggregates(rows, config).footerValues('orderitems')[0]!.label).toBe('sum')
    })

    it('returns 0 for an unrecognized fn', () => {
      const config: NctAggregatesConfig = {
        orderitems: { footer: [{ name: 'r', fn: 'bogus' as any, args: ['price'] }] },
      }
      expect(useNctAggregates(rows, config).footerValues('orderitems')[0]!.value).toBe(0)
    })

    it('returns 0 when args is missing/empty', () => {
      const config: NctAggregatesConfig = {
        orderitems: { footer: [{ name: 'r', fn: 'sum', args: [] }] },
      }
      expect(useNctAggregates(rows, config).footerValues('orderitems')[0]!.value).toBe(0)
    })

    it('returns an empty array when no footer defs are configured', () => {
      expect(useNctAggregates(rows, { orderitems: { columns: [] } }).footerValues('orderitems')).toEqual([])
    })
  })

  describe('null handling in reduce ops (design decisions worth locking in)', () => {
    it('sum treats missing values as 0', () => {
      const rows = [{ price: 100 }, { price: null }, {}]
      const config: NctAggregatesConfig = { orderitems: { footer: [{ name: 'r', fn: 'sum', args: ['price'] }] } }
      expect(useNctAggregates(rows, config).footerValues('orderitems')[0]!.value).toBe(100)
    })

    it('count only counts present values', () => {
      const rows = [{ price: 100 }, { price: null }, {}]
      const config: NctAggregatesConfig = { orderitems: { footer: [{ name: 'r', fn: 'count', args: ['price'] }] } }
      expect(useNctAggregates(rows, config).footerValues('orderitems')[0]!.value).toBe(1)
    })

    it('avg divides by the count of present values, not total rows', () => {
      const rows = [{ price: 100 }, { price: 200 }, { price: null }]
      const config: NctAggregatesConfig = { orderitems: { footer: [{ name: 'r', fn: 'avg', args: ['price'] }] } }
      expect(useNctAggregates(rows, config).footerValues('orderitems')[0]!.value).toBe(150) // not 100
    })

    it('avg rounds to 2 decimal places', () => {
      const rows = [{ price: 10 }, { price: 3 }, { price: 1 }]
      const config: NctAggregatesConfig = { orderitems: { footer: [{ name: 'r', fn: 'avg', args: ['price'] }] } }
      expect(useNctAggregates(rows, config).footerValues('orderitems')[0]!.value).toBe(4.67) // 14/3
    })

    it('min/max ignore nulls instead of coercing them to 0', () => {
      const rows = [{ price: 50 }, { price: null }, { price: 10 }]
      const min = useNctAggregates(rows, { orderitems: { footer: [{ name: 'r', fn: 'min', args: ['price'] }] } })
      const max = useNctAggregates(rows, { orderitems: { footer: [{ name: 'r', fn: 'max', args: ['price'] }] } })
      expect(min.footerValues('orderitems')[0]!.value).toBe(10) // not 0
      expect(max.footerValues('orderitems')[0]!.value).toBe(50)
    })

    it('min/max return 0 when every value is missing', () => {
      const rows = [{ price: null }, {}]
      const config: NctAggregatesConfig = { orderitems: { footer: [{ name: 'r', fn: 'min', args: ['price'] }] } }
      expect(useNctAggregates(rows, config).footerValues('orderitems')[0]!.value).toBe(0)
    })
  })

  describe('withParentFooterColumns — rollups injected into parent rows', () => {
    const orders = [
      { id: 1, orderitems: [{ id: 1, price: 100, quantity: 2 }, { id: 2, price: 50, quantity: 3 }] },
      { id: 2, orderitems: [{ id: 3, price: 20, quantity: 1 }] },
    ]
    const baseConfig: NctAggregatesConfig = {
      orderitems: {
        columns: [{ name: 'linetotal', label: 'Line total', fn: 'multiply', args: ['price', 'quantity'] }],
        footer: [{ name: 'total_amount', label: 'Total Amount', fn: 'sum', args: ['linetotal'] }],
      },
    }

    it('injects the child footer total by default (footerInParent omitted → true)', () => {
      const result = useNctAggregates(orders, baseConfig).withParentFooterColumns().value
      expect(result[0]!.total_amount).toBe(350)
      expect(result[1]!.total_amount).toBe(20)
    })

    it('injects nothing when footerInParent is false', () => {
      const config = { orderitems: { ...baseConfig.orderitems, footerInParent: false as const } }
      const result = useNctAggregates(orders, config).withParentFooterColumns().value
      expect(result[0]!.total_amount).toBeUndefined()
    })

    it('injects only the named footer defs when footerInParent is a string array', () => {
      const config: NctAggregatesConfig = {
        orderitems: {
          columns: baseConfig.orderitems?.columns,
          footer: [
            { name: 'total_amount', label: 'Total Amount', fn: 'sum', args: ['linetotal'] },
            { name: 'item_count', label: 'Item Count', fn: 'count', args: ['linetotal'] },
          ],
          footerInParent: ['total_amount'],
        },
      }
      const result = useNctAggregates(orders, config).withParentFooterColumns().value
      expect(result[0]!.total_amount).toBe(350)
      expect(result[0]!.item_count).toBeUndefined()
    })

    it('skips a resource when the parent row has no matching child array', () => {
      const result = useNctAggregates([{ id: 1 }], baseConfig).withParentFooterColumns().value
      expect(result[0]).toEqual({ id: 1 })
    })

    it('skips a resource with no footer defs configured', () => {
      const config: NctAggregatesConfig = { orderitems: { columns: baseConfig.orderitems?.columns } }
      const result = useNctAggregates(orders, config).withParentFooterColumns().value
      expect(result[0]!.total_amount).toBeUndefined()
    })
  })

  describe('reactivity with a Ref source', () => {
    it('recomputes withVirtualColumns when the ref changes', () => {
      const source = ref<Array<Record<string, unknown>>>([{ id: 1, price: 100, quantity: 2 }])
      const config: NctAggregatesConfig = {
        orderitems: { columns: [{ name: 'linetotal', label: 'Line total', fn: 'multiply', args: ['price', 'quantity'] }] },
      }
      const linetotal = useNctAggregates(source, config).withVirtualColumns('orderitems')
      expect(linetotal.value[0]!.linetotal).toBe(200)

      source.value = [{ id: 1, price: 10, quantity: 5 }]
      expect(linetotal.value[0]!.linetotal).toBe(50)
    })

    it('falls back to an empty array when the ref value is undefined', () => {
      const source = ref<Array<Record<string, unknown>> | undefined>(undefined)
      const result = useNctAggregates(source, { orderitems: { columns: [] } }).withVirtualColumns('orderitems').value
      expect(result).toEqual([])
    })
  })
})