import { title } from "@/components/primitives";
import { getPostData } from "@/lib/posts";

export default async function PostPage({ params }: { params : { slug: string }}) {
  const postData = await getPostData(params.slug as string);

  return (
    <div className="flex flex-col gap-4">
      <h1 className={title()}>{postData.title}</h1>
      <p className="text-sm text-gray-500">{postData.date}</p>
      <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />

    </div>


  );
}
