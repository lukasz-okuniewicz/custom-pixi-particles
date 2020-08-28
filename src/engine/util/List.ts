export default class List {
  first: any = null
  length = 0

  isEmpty() {
    return this.first === null
  }

  add(item: any) {
    item.prev = null
    item.next = null
    if (this.first) {
      this.first.prev = item
    }

    item.next = this.first
    this.first = item
    this.length++
    return item
  }

  forEach(callback: any) {
    let current: any = this.first
    let next = null
    while (current) {
      next = current.next
      callback(current)
      current = next
    }
  }

  remove(item: any) {
    const previous = item.prev
    const next = item.next

    if (previous) previous.next = next

    if (next) next.prev = previous

    if (this.first === item) this.first = item.next

    item.prev = null
    item.next = null
    this.length--
  }
}
