# Contributing

## Add Your API

saxi.ai accepts free public APIs through pull requests. Read the canonical submission rules first:

https://github.com/alexander-schneider/saxi.ai/blob/main/data/community-apis/README.md

Process:

1. Create one new JSON file in `data/community-apis/`.
2. Use `data/community-apis/_template.json` as the shape.
3. Use a lowercase kebab-case filename, for example `my-example-api.json`.
4. Replace every placeholder value from the template.
5. Open a pull request. GitHub will use the repository's default pull request template.

The "Add your API" button on saxi.ai opens GitHub's new-file editor, not the final pull request screen. GitHub needs a branch with your JSON file before it can create a pull request. After you rename the file, replace the placeholders, and click "Propose changes", GitHub opens the pull request flow.

Pull requests run automatic validation for required fields, allowed categories, URL format, and filename format.
