import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
export function Markdown({ body }: { body: string }) {
  return (
    <div className="markdown-body">
      <MDXRemote
        source={body}
        options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              {...props}
              {...(href?.startsWith('https://')
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              {children}
            </a>
          ),
        }}
      />
    </div>
  );
}
