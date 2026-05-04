import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import InlineEdit from './InlineEdit';

describe('InlineEdit', () => {
  afterEach(() => cleanup());

  it('renders the input with the supplied initialTitle', () => {
    const { getByRole } = render(
      <InlineEdit initialTitle="kup mleko" onSave={() => {}} onCancel={() => {}} />
    );
    expect((getByRole('textbox') as HTMLInputElement).value).toBe('kup mleko');
  });

  it('focuses input and selects all text on mount', () => {
    const { getByRole } = render(
      <InlineEdit initialTitle="hello" onSave={() => {}} onCancel={() => {}} />
    );
    const input = getByRole('textbox') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('hello'.length);
  });

  it('Enter calls onSave with trimmed value', () => {
    const onSave = vi.fn();
    const { getByRole } = render(
      <InlineEdit initialTitle="old" onSave={onSave} onCancel={() => {}} />
    );
    const input = getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  new title  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith('new title');
  });

  it('Enter with whitespace-only value shows danger ring; no callbacks', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { getByRole } = render(
      <InlineEdit initialTitle="old" onSave={onSave} onCancel={onCancel} />
    );
    const input = getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(input.className).toMatch(/ring-danger/);
  });

  it('Enter with value identical to initialTitle calls onCancel and not onSave', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { getByRole } = render(
      <InlineEdit initialTitle="same" onSave={onSave} onCancel={onCancel} />
    );
    fireEvent.keyDown(getByRole('textbox'), { key: 'Enter' });
    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('Zapisz button submits and uses preventDefault on mouseDown to keep focus', () => {
    const onSave = vi.fn();
    const { getByRole, getByText } = render(
      <InlineEdit initialTitle="old" onSave={onSave} onCancel={() => {}} />
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'new' } });
    const btn = getByText('Zapisz');
    const md = fireEvent.mouseDown(btn);
    // mouseDown default prevented => returns false
    expect(md).toBe(false);
    fireEvent.click(btn);
    expect(onSave).toHaveBeenCalledWith('new');
  });

  it('Esc calls onCancel', () => {
    const onCancel = vi.fn();
    const { getByRole } = render(
      <InlineEdit initialTitle="x" onSave={() => {}} onCancel={onCancel} />
    );
    fireEvent.keyDown(getByRole('textbox'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('blur calls onCancel', () => {
    const onCancel = vi.fn();
    const { getByRole } = render(
      <InlineEdit initialTitle="x" onSave={() => {}} onCancel={onCancel} />
    );
    fireEvent.blur(getByRole('textbox'));
    expect(onCancel).toHaveBeenCalled();
  });
});
