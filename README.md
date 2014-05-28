Node wrapper to search Spotlight.

```
Spotlight = require('./spotlight');

spotlight = new Spotlight();

spotlight.search("(kMDItemFSName LIKE '*filename*')", function(result) {
    console.log('Found file: ' + result);
});
```
