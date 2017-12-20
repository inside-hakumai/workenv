;; Using Cask 
(require 'cask "~/.cask/cask.el")
(cask-initialize)

;; Added by Package.el.  This must come before configurations of
;; installed packages.  Don't delete this line.  If you don't want it,
;; just comment it out by adding a semicolon to the start of the line.
;; You may delete these explanatory comments.
(package-initialize)

(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(package-selected-packages (quote (python-mode scroll-restore)))
 '(vc-follow-symlinks t))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(linum ((t (:inherit (shadow default))))))

;; auto-complete
(require 'auto-complete-config)
(ac-config-default)
(add-to-list 'ac-modes 'text-mode)         ;; text-modeでも自動的に有効にする
(add-to-list 'ac-modes 'fundamental-mode)  ;; fundamental-mode
(add-to-list 'ac-modes 'org-mode)
(add-to-list 'ac-modes 'yatex-mode)
(setq ac-use-menu-map t)       ;; 補完メニュー表示時にC-n/C-pで補完候補選択
(setq ac-use-fuzzy t)          ;; 曖昧マッチ

;; linum-mode with hlinum
(require 'hlinum)
(hlinum-activate)
(global-linum-mode t)
(setq linum-format "%4d ")
;; (custom-set-faces
;; '(linum ((t (:inherit (shadow default))))))
(custom-set-faces
 '(linum-highlight-face ((t (:foreground "black"
                             :background "#03dbda")))))


;; helm
(define-key global-map (kbd "C-x C-f") 'helm-find-files)
(global-set-key (kbd "M-x") 'helm-M-x)
(require 'helm-config)
(helm-mode 1)

;; configs regardless of mode
(setq-default tab-width 4
	      indent-tabs-mode nil)

;; shell-mode
(setq-default sh-basic-offset 4)
(setq-default sh-indentation 4)

;; JavaScript mode
(setq js-indent-level 3)

;; sync clipboard of OS and kill ring of Emacs
(defun copy-from-osx ()
  (shell-command-to-string "pbpaste"))

(defun paste-to-osx (text &optional push)
  (let ((process-connection-type nil))
    (let ((proc (start-process "pbcopy" "*Messages*" "pbcopy")))
      (process-send-string proc text)
      (process-send-eof proc))))

(setq interprogram-cut-function 'paste-to-osx)
(setq interprogram-paste-function 'copy-from-osx)

;; Apply Powerline 
(require 'powerline)
(powerline-default-theme)

;; Apply volatile-highlights
(require 'volatile-highlights)
(volatile-highlights-mode t)

;; Apply anzu
(global-anzu-mode +1)
(custom-set-variables
 '(anzu-mode-lighter "")
 '(anzu-deactivate-region t)
 '(anzu-search-threshold 1000))
