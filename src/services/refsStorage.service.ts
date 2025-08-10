import { ComponentRef, computed, Injectable, signal } from '@angular/core';

interface RefItem {
  ref: ComponentRef<any>;
  title: string; //TODO: rewrite to uuids or componentIds
  source: Symbol;
}

@Injectable({
  providedIn: 'root',
})
export class RefsStorageService {
  private _refsList = signal<RefItem[]>([]);

  public refsList = computed(() => this._refsList());

  public addRefsInList(refItems: RefItem | RefItem[]) {
    this._refsList.update((prev) => {
      if (Array.isArray(refItems)) {
        return [...prev, ...refItems];
      }
      return [...prev, refItems];
    });
  }

  public removeRefsFromList(source: Symbol) {
    this._refsList.update((prev) => {
      const newValue: RefItem[] = [];
      for (const item of prev) {
        if (item.source === source) {
          item.ref.destroy();
          continue;
        }
        newValue.push(item);
      }
      return newValue;
    });
  }
}
