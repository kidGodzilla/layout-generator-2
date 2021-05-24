# layout-generator-2

## Demo

https://kidgodzilla.github.io/layout-generator-2/#h/10.jpg;cta/16.jpg;f/9.jpg;con/14.jpg;con/15.jpg;f/20.jpg;con/19.jpg;p/5.jpg;ft/9.jpg;

Your hash changes with each layout edit. You can share URLs & come back to them later.

## Editing index.html to use your own design

You can modify this page to host your own template & images.

Export your images, and organize them inside the project, deleting all the existing subdirectories.

I recommend placing the images in folders based on how you wish to categorize them, but this is optional.

All of the structure of the "app" is inside index.html

Each category has a `data-type` attribute, like: `<a data-type="h">Menus</a>`

For each category, the script expects a list of `.qitem`, each containing an image block.

```html
<li>
    <div class="qitem h">
        <div>
            <span class="question"><img src="h/1.jpg"></span>
        </div>
    </div>
</li>
```

I have no idea why I chose the classnames `.question` and `.qitem`, this code is 4 years old 😅

