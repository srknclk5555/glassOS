import { RecipeEditorV2Client } from "./recipe-editor-v2-client";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecipeEditorV2Client recipeId={id} />;
}
