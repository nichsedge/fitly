import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResolvedImage } from './ResolvedImage';
import '@testing-library/jest-dom';
import { ImageService } from '../services/ImageService';

vi.mock('../services/ImageService', () => ({
  ImageService: {
    resolveImageUrl: vi.fn(),
  },
}));

const mockedResolve = vi.mocked(ImageService.resolveImageUrl);

describe('ResolvedImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing without src and without fallback', () => {
    const { container } = render(<ResolvedImage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders fallback when no src is given', () => {
    render(<ResolvedImage fallback={<div data-testid="fallback" />} />);
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('renders data: URLs directly without calling the image service', () => {
    render(<ResolvedImage src="data:image/png;base64,AAA" alt="photo" />);
    const img = screen.getByAltText('photo');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAA');
    expect(mockedResolve).not.toHaveBeenCalled();
  });

  it.each(['https://example.com/a.png', 'blob:abc-123'])(
    'renders %s directly without resolution',
    (src) => {
      render(<ResolvedImage src={src} alt="photo" />);
      expect(screen.getByAltText('photo')).toHaveAttribute('src', src);
      expect(mockedResolve).not.toHaveBeenCalled();
    }
  );

  it('resolves IndexedDB refs asynchronously via ImageService', async () => {
    mockedResolve.mockResolvedValueOnce('blob:resolved-1');
    render(<ResolvedImage src="img-ref-42" alt="photo" />);

    // Initially no img until resolved
    expect(screen.queryByAltText('photo')).toBeNull();

    await vi.waitFor(() => {
      expect(screen.getByAltText('photo')).toHaveAttribute('src', 'blob:resolved-1');
    });
    expect(mockedResolve).toHaveBeenCalledWith('img-ref-42');
  });

  it('falls back to the raw ref when resolution returns nothing usable', async () => {
    mockedResolve.mockImplementation(async (ref) => ref);
    render(<ResolvedImage src="missing-ref" alt="photo" />);
    await vi.waitFor(() => {
      expect(screen.getByAltText('photo')).toHaveAttribute('src', 'missing-ref');
    });
  });

  it('applies a default empty alt for decorative images', () => {
    render(<ResolvedImage src="data:image/png;base64,AAA" />);
    const img = screen.getByRole('presentation');
    expect(img).toHaveAttribute('alt', '');
  });
});
