package com.tradeshift.plugin;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.DataKeys;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.Messages;
import com.intellij.openapi.util.IconLoader;
import com.intellij.openapi.vfs.VirtualFile;
import freemarker.template.Configuration;
import freemarker.template.Template;
import freemarker.template.TemplateException;
import freemarker.template.Version;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.swing.*;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringWriter;
import java.io.Writer;
import java.lang.invoke.MethodHandles;
import java.util.Collections;

public class TradeshiftV4Action extends AnAction {

    public static final String TRADESHIFT_V4_PLUGIN_ERROR = "Tradeshift V4 plugin error";
    private static final Logger logger = LoggerFactory.getLogger(MethodHandles.lookup().lookupClass());
    Configuration freemarkerConfiguration = new Configuration(new Version(2, 3, 26));

    {
        freemarkerConfiguration.setClassForTemplateLoading(this.getClass(), "/");
    }

    @Override
    public void actionPerformed(AnActionEvent actionEvent) {
        Project currentProject = DataKeys.PROJECT.getData(actionEvent.getDataContext());
        Icon icon = IconLoader.getIcon("/icons/favicon-32x32.png");
        if (currentProject == null || currentProject.getBaseDir() == null || currentProject.getBaseDir().findFileByRelativePath("src/main/v4apps/apps") == null) {
            Messages.showDialog("Tradeshift Apps application should be opened", TRADESHIFT_V4_PLUGIN_ERROR, new String[]{"OK"}, -1, icon);
            return;
        }
        final VirtualFile virtualFile = currentProject.getBaseDir();
        VirtualFile apps = virtualFile.findFileByRelativePath("src/main/v4apps/apps");

        try {
            final String name = (String) JOptionPane.showInputDialog(null, "What's V4 Application name?",
                    "Tradeshift Application", JOptionPane.QUESTION_MESSAGE, icon, null, null);
            if (isEmpty(name)) {
                return;
            }
            //check application with such name does not exist
            if (apps.findChild(name) != null) {
                Messages.showDialog("Tradeshift application " + name + " already exists", TRADESHIFT_V4_PLUGIN_ERROR, new String[]{"OK"}, -1, icon);
                return;
            }

            Writer manifestWriter = new StringWriter();
            Template template = freemarkerConfiguration.getTemplate("templates/application/manifest.json.ftl");
            template.process(Collections.singletonMap("name", name), manifestWriter);

            byte[] applicationIconBytes = getResourceAsByteArray("icons/Tradeshift.Demo.svg");
            byte[] mainHtmlBytes = getResourceAsByteArray("scripts/main.html");
            byte[] browserJsBytes = getResourceAsByteArray("scripts/browser.js");
            byte[] mainJsBytes = getResourceAsByteArray("scripts/main.js");


            ApplicationManager.getApplication().runWriteAction(new Runnable() {
                @Override
                public void run() {
                    try {
                        VirtualFile newAppDir = apps.createChildDirectory(this, name);
                        VirtualFile srcV4 = newAppDir.createChildDirectory(this, "src");

                        VirtualFile js = srcV4.createChildDirectory(this, "js");
                        VirtualFile controllers = js.createChildDirectory(this, "controllers");
                        VirtualFile mainJs = controllers.createChildData(this, "main.js");
                        mainJs.setBinaryContent(mainJsBytes);

                        VirtualFile views = srcV4.createChildDirectory(this, "views");
                        VirtualFile mainHtml = views.createChildData(this, "main.html");
                        mainHtml.setBinaryContent(mainHtmlBytes);

                        VirtualFile icons = srcV4.createChildDirectory(this, "icons");
                        VirtualFile iconFile = icons.createChildData(this, "Tradeshift.Demo.svg");
                        iconFile.setBinaryContent(applicationIconBytes);

                        newAppDir.createChildDirectory(this, "test");
                        VirtualFile manifestFile = newAppDir.createChildData(this, "manifest.json");

                        byte[] bytes = manifestWriter.toString().getBytes("UTF-8");
                        manifestFile.setBinaryContent(bytes);

                        VirtualFile browserJs = newAppDir.createChildData(this, name + ".browser.js");
                        browserJs.setBinaryContent(browserJsBytes);
                        newAppDir.createChildData(this, name + ".less");
                        newAppDir.createChildData(this, name + ".server.js");
                    } catch (IOException e) {
                        logger.error("IOException", e);
                        Messages.showDialog(e.getMessage(), TRADESHIFT_V4_PLUGIN_ERROR, new String[]{"OK"}, -1, icon);
                    }
                }
            });
        } catch (IOException e) {
            logger.error("IOException", e);
            Messages.showDialog(e.getMessage(), TRADESHIFT_V4_PLUGIN_ERROR, new String[]{"OK"}, -1, icon);
        } catch (TemplateException e) {
            logger.error("TemplateException", e);
            Messages.showDialog(e.getMessage(), TRADESHIFT_V4_PLUGIN_ERROR, new String[]{"OK"}, -1, icon);
        }
    }

    private byte[] getResourceAsByteArray(String resourcePath) throws IOException {
        ClassLoader classLoader = getClass().getClassLoader();
        byte[] applicationIconBytes;
        try (InputStream stream = classLoader.getResourceAsStream(resourcePath)) {
            applicationIconBytes = IOUtils.toByteArray(stream);
        }
        return applicationIconBytes;
    }

    @Override
    public void update(AnActionEvent e) {
        e.getPresentation().setIcon(IconLoader.getIcon("/icons/favicon-16x16.png"));
    }

    public static boolean isEmpty(CharSequence cs) {
        return cs == null || cs.length() == 0;
    }
}
