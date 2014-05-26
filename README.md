Node wrapper to search Spotlight.

More comprehensive documentation soon.

```
Spotlight = require('./spotlight');

spotlight = new Spotlight(function(result) {
  console.log('Found file: ' + result);
});

spotlight.search("(kMDItemFSName LIKE 'filename*')");
```
