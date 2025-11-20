import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button 컴포넌트', () => {
  it('기본 버튼이 렌더링된다', () => {
    const { getByText } = render(<Button>테스트 버튼</Button>);
    expect(getByText('테스트 버튼')).toBeInTheDocument();
  });

  it('hero variant가 올바른 클래스를 적용한다', () => {
    const { getByText } = render(<Button variant="hero">Hero Button</Button>);
    const button = getByText('Hero Button');
    expect(button).toHaveClass('bg-gradient-primary');
  });

  it('xl 사이즈가 올바른 클래스를 적용한다', () => {
    const { getByText } = render(<Button size="xl">XL Button</Button>);
    const button = getByText('XL Button');
    expect(button).toHaveClass('h-14');
  });

  it('disabled 상태가 작동한다', () => {
    const { getByText } = render(<Button disabled>Disabled Button</Button>);
    const button = getByText('Disabled Button');
    expect(button).toBeDisabled();
  });
});
