import './Skeleton.css';

// grey shimmering placeholder shaped like the content that is about to load
export function Skeleton({width = '100%', height = 16, radius = 8, style}) {
    return <span className="skeleton" style={{width, height, borderRadius: radius, ...style}} aria-hidden="true" />;
}

// a list of card-shaped placeholders (pins, history, users)
export function ListSkeleton({rows = 4, thumb = false}) {
    return (
        <div className="skeleton-list" role="status" aria-label="טוען">
            {Array.from({length: rows}, (_, i) => (
                <div className="skeleton-card" key={i}>
                    {thumb && <Skeleton width={56} height={56} radius={10} />}
                    <div className="skeleton-lines">
                        <Skeleton width="60%" height={16} />
                        <Skeleton width="35%" height={12} />
                    </div>
                </div>
            ))}
        </div>
    );
}
