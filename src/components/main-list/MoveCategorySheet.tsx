import { t } from '../../i18n';
import type { Category, Todo } from '../../types';
import Sheet from './Sheet';

interface MoveCategorySheetProps {
  todo: Todo | null;
  categories: Category[];
  onClose: () => void;
  onMove: (todoId: string, categoryId: string) => void | Promise<void>;
}

// Bottom sheet that lists every category as a tap target. Picking the
// todo's current category is a no-op visual confirmation; picking any
// other category invokes onMove and closes. The current category is
// labelled "Tutaj" so the active state is obvious without an icon.
export default function MoveCategorySheet({
  todo,
  categories,
  onClose,
  onMove,
}: MoveCategorySheetProps) {
  const open = todo !== null;

  const handlePick = async (categoryId: string) => {
    if (!todo) return;
    if (todo.category === categoryId) {
      onClose();
      return;
    }
    onClose();
    await onMove(todo.id, categoryId);
  };

  return (
    <Sheet open={open} onClose={onClose} title={t.moveToCategoryTitle}>
      {todo === null ? (
        <span aria-hidden="true" />
      ) : (
        <ul className="flex flex-col divide-y divide-hairlineSoft">
          {categories.map((cat) => {
            const isCurrent = todo.category === cat.id;
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => void handlePick(cat.id)}
                  aria-current={isCurrent ? 'true' : undefined}
                  className="w-full flex items-center justify-between min-h-[48px] px-2 text-left text-text"
                >
                  <span className="text-base">{cat.name}</span>
                  {isCurrent && (
                    <span className="text-textMute text-sm">
                      {t.moveToCategoryHere}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
