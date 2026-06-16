SRC_HASH=$(find "$GITHUB_ACTION_PATH/src" -type f -name "*.ts" -exec md5sum {} + | sort | md5sum | awk '{print $1}')

PKG_HASH=$(md5sum "$GITHUB_ACTION_PATH/package.json" | awk '{print $1}')

echo "DOMLOO_SRC_HASH=${SRC_HASH}-${PKG_HASH}" >> $GITHUB_ENV